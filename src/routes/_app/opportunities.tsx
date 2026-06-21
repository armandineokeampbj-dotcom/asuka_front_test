import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { Bookmark, Briefcase, MapPin, CalendarClock, Loader2, Sparkles, X, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { opportunitiesAPI, profileAPI } from "@/lib/api-client";
import { useAuth } from "@/context/AuthProvider";
import { baselineMatch } from "@/lib/matching";

export const Route = createFileRoute("/_app/opportunities")({ component: Opps });

type Opp = {
  _id?: string;
  id: string;
  type: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  orgName: string | null;
  location: string | null;
  remote: boolean;
  deadline: string | null;
  emoji: string | null;
  link?: string | null;
  skills: string[];
  tags?: string[];
  country?: string | null;
  languages?: string[];
};

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const { t } = useLang();
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
      {t("opp_deadline_expired")}
    </span>
  );
  if (days === 0) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
      {t("opp_deadline_today")}
    </span>
  );
  if (days <= 7) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
      {t("opp_deadline_days_prefix")}{days}
    </span>
  );
  if (days <= 14) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      {t("opp_deadline_days_prefix")}{days}
    </span>
  );
  return null;
}

function Opps() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [filterRemote, setFilterRemote] = useState(false);
  const [sort, setSort] = useState<"match" | "deadline">("match");
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [skillsV2, setSkillsV2] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const response = await opportunitiesAPI.getOpportunities();
        const data = response?.opportunities || [];
        const transformed: Opp[] = (data ?? []).map((opp: any) => ({
          _id: opp._id,
          id: opp._id ?? opp.id,
          type: opp.type ?? "",
          titleFr: opp.title_fr ?? opp.title ?? "",
          titleEn: opp.title_en ?? opp.title ?? "",
          descriptionFr: opp.description_fr ?? opp.description ?? null,
          descriptionEn: opp.description_en ?? opp.description ?? null,
          orgName: opp.organization ?? opp.org_name ?? null,
          location: opp.location ?? null,
          remote: opp.remote ?? false,
          deadline: opp.deadline ?? null,
          emoji: opp.emoji ?? null,
          link: opp.link ?? null,
          skills: Array.isArray(opp.skills) ? opp.skills : [],
          tags: Array.isArray(opp.tags) ? opp.tags : [],
          country: opp.country ?? null,
          languages: Array.isArray(opp.languages) ? opp.languages : [],
        }));
        setOpps(transformed);
      } catch (err) {
        console.error("Load opportunities error:", err);
        toast.error(t("opp_load_error"));
      } finally {
        setLoading(false);
      }
    })();

    if (user) {
      opportunitiesAPI.getSavedOpportunities()
        .then((data: any) => {
          const list = data?.opportunities ?? data ?? [];
          const ids = list.map((o: any) => o._id ?? o.id).filter(Boolean);
          setSavedIds(new Set(ids));
        })
        .catch(() => {});
      profileAPI.getProfile(user.id).then((data) => setProfile(data)).catch(() => {});
      profileAPI.getSkills(user.id).then((data) => setSkillsV2((data ?? []).map((s: any) => s.name))).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filters = [
    { v: "all", l: t("opp_filter_all") },
    { v: "job", l: t("opp_filter_jobs") },
    { v: "scholarship", l: t("opp_filter_scholarship") },
    { v: "training", l: t("opp_filter_training") },
    { v: "grant", l: t("opp_filter_grant") },
    { v: "mentorship", l: t("opp_filter_mentor") },
  ];

  const matchProfile = {
    skills: [...(profile?.skills ?? []), ...skillsV2],
    interests: profile?.interests ?? [],
    goals: profile?.goals ?? [],
    country: profile?.country,
    primary_language: profile?.primary_language,
    languages_spoken: profile?.languages_spoken ?? [],
    remote_available: profile?.remote_available,
  };

  const uniqueCountries = [...new Set(opps.map((o) => o.country).filter(Boolean) as string[])].sort();
  const uniqueOrgs = [...new Set(opps.map((o) => o.orgName).filter(Boolean) as string[])].sort();

  const hasActiveFilters = filter !== "all" || !!filterCountry || !!filterOrg || filterRemote;

  const scored = opps
    .filter((o) => filter === "all" || o.type === filter)
    .filter((o) => !filterCountry || o.country === filterCountry)
    .filter((o) => !filterOrg || o.orgName === filterOrg)
    .filter((o) => !filterRemote || o.remote === true)
    .map((o) => ({
      o,
      m: baselineMatch(matchProfile, {
        skills: o.skills,
        tags: o.tags,
        country: o.country,
        remote: o.remote,
        languages: o.languages,
      }),
    }))
    .sort((a, b) => {
      if (sort === "deadline") {
        const da = a.o.deadline ? new Date(a.o.deadline).getTime() : Infinity;
        const db = b.o.deadline ? new Date(b.o.deadline).getTime() : Infinity;
        return da - db;
      }
      return b.m.score - a.m.score;
    });

  const resetFilters = () => {
    setFilter("all");
    setFilterCountry("");
    setFilterOrg("");
    setFilterRemote(false);
  };

  const handleSave = async (o: Opp, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const id = o.id;
    const wasSaved = savedIds.has(id);
    setSavingId(id);
    try {
      await opportunitiesAPI.saveOpportunity(id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.delete(id) : next.add(id);
        return next;
      });
      toast(wasSaved ? t("opp_unsaved") : t("opp_saved"));
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t("opp_title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t("opp_subtitle")}</p>
      </div>

      {/* Filtres type */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition whitespace-nowrap ${
              filter === f.v
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border hover:border-primary/40"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Filtres avancés + tri */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {uniqueCountries.length > 0 && (
            <select
              className="h-8 flex-1 sm:flex-none min-w-[130px] rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
            >
              <option value="">{t("opp_filter_all_countries")}</option>
              {uniqueCountries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {uniqueOrgs.length > 0 && (
            <select
              className="h-8 flex-1 sm:flex-none min-w-[130px] rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
            >
              <option value="">{t("opp_filter_all_orgs")}</option>
              {uniqueOrgs.map((org) => <option key={org} value={org}>{org}</option>)}
            </select>
          )}
          <button
            onClick={() => setFilterRemote(!filterRemote)}
            className={`h-8 px-3 rounded-lg border text-sm transition whitespace-nowrap ${
              filterRemote
                ? "bg-primary/10 border-primary/40 text-primary font-medium"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            {t("opp_filter_remote")}
          </button>
        </div>
        <div className="flex justify-end sm:justify-start">
          <select
            className="h-8 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
            value={sort}
            onChange={(e) => setSort(e.target.value as "match" | "deadline")}
          >
            <option value="match">{t("opp_sort_match")}</option>
            <option value="deadline">{t("opp_sort_deadline")}</option>
          </select>
        </div>
      </div>

      {/* Chips filtres actifs + compteur */}
      {!loading && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {scored.length} {t("opp_results")}
            {hasActiveFilters && ` · ${t("opp_filter_active")}`}
          </span>
          {filterCountry && (
            <button
              onClick={() => setFilterCountry("")}
              className="flex items-center gap-1 h-6 px-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition"
            >
              {filterCountry} <X className="h-3 w-3" />
            </button>
          )}
          {filterOrg && (
            <button
              onClick={() => setFilterOrg("")}
              className="flex items-center gap-1 h-6 px-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition"
            >
              {filterOrg} <X className="h-3 w-3" />
            </button>
          )}
          {filterRemote && (
            <button
              onClick={() => setFilterRemote(false)}
              className="flex items-center gap-1 h-6 px-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition"
            >
              Remote <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 border-border/50 flex flex-col gap-3 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="h-8 w-8 rounded-lg bg-muted" />
                <div className="h-5 w-20 rounded-full bg-muted" />
              </div>
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted mt-1" />
              <div className="mt-auto pt-3 flex gap-2">
                <div className="h-8 flex-1 rounded-md bg-muted" />
                <div className="h-8 w-8 rounded-md bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && scored.length === 0 && (
        <Card className="p-14 text-center border-dashed space-y-3">
          {hasActiveFilters ? (
            <>
              <p className="text-2xl">🔍</p>
              <p className="text-muted-foreground font-medium">{t("opp_empty_filtered")}</p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t("opp_reset_filters")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-2xl">📭</p>
              <p className="text-muted-foreground">{t("opp_empty")}</p>
            </>
          )}
        </Card>
      )}

      {!loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scored.map(({ o, m }) => {
            const isSaved = savedIds.has(o.id);
            const title = lang === "fr" ? o.titleFr : o.titleEn;
            return (
              <Card key={o._id ?? o.id} className="p-5 border-border/50 hover:shadow-glow transition flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-3xl shrink-0">{o.emoji ?? "✨"}</div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <DeadlineBadge deadline={o.deadline} />
                    <Badge className="bg-gradient-hero text-primary-foreground border-0 text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {m.score}%
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 font-semibold leading-snug line-clamp-2">{title || "—"}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{o.orgName ?? "—"}</div>

                <div className="mt-2 space-y-1">
                  {(o.location || o.country) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{o.location ?? o.country}{o.remote ? " · Remote" : ""}</span>
                    </div>
                  )}
                  {o.deadline && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="h-3 w-3 shrink-0" />
                      {new Date(o.deadline).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </div>

                {m.reasons.length > 0 && (
                  <div className="text-[11px] text-muted-foreground mt-2 italic line-clamp-1">
                    {t("match_why")}: {m.reasons.join(" · ")}
                  </div>
                )}

                <div className="mt-auto pt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-hero border-0"
                    onClick={() => navigate({ to: "/opportunities/$id", params: { id: o.id } })}
                  >
                    <Briefcase className="h-3.5 w-3.5 mr-1" />
                    {t("opp_apply")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === o.id}
                    onClick={(e) => handleSave(o, e)}
                    className={isSaved ? "text-primary border-primary/40 bg-primary/5" : ""}
                    title={isSaved ? t("opp_unsaved") : t("opp_saved")}
                  >
                    {savingId === o.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
