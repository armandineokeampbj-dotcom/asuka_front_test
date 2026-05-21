import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { Bookmark, Briefcase, MapPin, CalendarClock, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { opportunitiesAPI, profileAPI } from "@/lib/api-client";
import { useAuth } from "@/context/AuthProvider";
import { awardXp, notify, awardBadgeIfMissing } from "@/lib/asuka-actions";
import { baselineMatch } from "@/lib/matching";

export const Route = createFileRoute("/_app/opportunities")({ component: Opps });

type Opp = {
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
  skills: string[];
  tags?: string[];
  country?: string | null;
  languages?: string[];
};

function Opps() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [opps, setOpps] = useState<Opp[]>([]);
  const [apps, setApps] = useState<Record<string, "saved" | "applied">>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [skillsV2, setSkillsV2] = useState<string[]>([]);

  const loadApps = async () => {
    if (!user?.id) return;
    try {
      const data = await opportunitiesAPI.getOpportunities();
      setOpps(data.opportunities || []);
      // Build apps map from opportunities data
      const appsMap: Record<string, "saved" | "applied"> = {};
      data.opportunities?.forEach((opp: any) => {
        if (opp.userSaved) appsMap[opp.id] = "saved";
        if (opp.userApplied) appsMap[opp.id] = "applied";
      });
      setApps(appsMap);
    } catch (err) {
      console.error("Load opportunities error:", err);
      toast.error("Erreur lors du chargement des opportunités");
    }
  };

  useEffect(() => {
    (async () => {
      const response = await opportunitiesAPI.getOpportunities();
      const data = response?.opportunities || [];
      // Transform snake_case from DB to camelCase for type
      const transformed = data?.map((opp: any) => ({
        id: opp.id,
        type: opp.type,
        titleFr: opp.title_fr,
        titleEn: opp.title_en,
        descriptionFr: opp.description_fr,
        descriptionEn: opp.description_en,
        orgName: opp.org_name,
        location: opp.location,
        remote: opp.remote,
        deadline: opp.deadline,
        emoji: opp.emoji,
        skills: opp.skills,
        tags: opp.tags,
        country: opp.country,
        languages: opp.languages,
      })) ?? [];
      setOpps(transformed);
      setLoading(false);
    })();
    loadApps();
    if (user) {
      profileAPI.getProfile(user.id).then((data) => setProfile(data)).catch(() => {});
      profileAPI.getSkills(user.id).then((data) => setSkillsV2((data ?? []).map((s: any) => s.name))).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filters = [
    { v: "all", l: t("opp_filter_all") }, { v: "job", l: t("opp_filter_jobs") },
    { v: "scholarship", l: t("opp_filter_scholarship") }, { v: "training", l: t("opp_filter_training") },
    { v: "grant", l: t("opp_filter_grant") }, { v: "mentorship", l: t("opp_filter_mentor") },
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
  const scored = opps
    .filter((o) => filter === "all" || o.type === filter)
    .map((o) => ({ o, m: baselineMatch(matchProfile, { skills: o.skills, tags: o.tags, country: o.country, remote: o.remote, languages: o.languages }) }))
    .sort((a, b) => b.m.score - a.m.score);

  const apply = async (o: Opp) => {
    if (!user) return;
    setBusyId(o.id);
    const isFirst = Object.values(apps).every((s) => s !== "applied");
    try {
      await opportunitiesAPI.applyForOpportunity(o.id);
    } catch (error: any) {
      setBusyId(null);
      return toast.error(error.message || "Error applying to opportunity");
    }
    await awardXp(user.id, 30, "apply_opportunity", { opportunity_id: o.id });
    await notify(
      user.id,
      lang === "fr" ? `Candidature envoyée 🎯` : `Application sent 🎯`,
      lang === "fr" ? `Tu as postulé à « ${o.titleFr} ».` : `You applied to "${o.titleEn}".`,
      "application",
      { opportunity_id: o.id },
    );
    if (isFirst) await awardBadgeIfMissing(user.id, "first_apply");
    toast.success(lang === "fr" ? "Candidature envoyée ✨ +30 XP" : "Application sent ✨ +30 XP");
    setBusyId(null);
    loadApps();
  };

  const save = async (o: Opp) => {
    if (!user) return;
    setBusyId(o.id);
    try {
      await opportunitiesAPI.saveOpportunity(o.id);
    } catch (error: any) {
      setBusyId(null);
      return toast.error(error.message || "Error saving opportunity");
    }
    toast(lang === "fr" ? "Sauvegardé" : "Saved");
    setBusyId(null);
    loadApps();
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">{t("opp_title")}</h1><p className="text-muted-foreground mt-1">{t("opp_subtitle")}</p></div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition whitespace-nowrap ${filter === f.v ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:border-primary/40"}`}>{f.l}</button>
        ))}
      </div>
      {loading && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("loading")}</div>}
      {!loading && scored.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground border-dashed">
          {lang === "fr" ? "Aucune opportunité pour ce filtre." : "No opportunities for this filter."}
        </Card>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scored.map(({ o, m }) => {
          const status = apps[o.id];
          const title = lang === "fr" ? o.titleFr : o.titleEn;
          return (
          <Card key={o.id} className="p-5 border-border/50 hover:shadow-glow transition flex flex-col">
            <div className="flex items-start justify-between">
              <div className="text-3xl">{o.emoji ?? "✨"}</div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-gradient-hero text-primary-foreground border-0"><Sparkles className="h-3 w-3 mr-1" />{m.score}% {t("match_score")}</Badge>
                {status === "applied" ? (
                  <Badge className="bg-success/15 text-foreground border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />{lang === "fr" ? "Postulé" : "Applied"}</Badge>
                ) : status === "saved" ? (
                  <Badge variant="outline">{lang === "fr" ? "Sauvegardé" : "Saved"}</Badge>
                ) : null}
              </div>
            </div>
            <div className="mt-3 font-semibold leading-snug">{title}</div>
            <div className="text-xs text-muted-foreground mt-1">{o.orgName ?? "—"}</div>
            {o.location && <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" />{o.location}{o.remote ? " · Remote" : ""}</div>}
            {o.deadline && <div className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" />{o.deadline}</div>}
            {m.reasons.length > 0 && (
              <div className="text-[11px] text-muted-foreground mt-2 italic">{t("match_why")}: {m.reasons.join(" · ")}</div>
            )}
            <div className="mt-auto pt-4 flex gap-2">
              <Button size="sm" disabled={busyId === o.id || status === "applied"} className="flex-1 bg-gradient-hero border-0" onClick={() => apply(o)}>
                <Briefcase className="h-3.5 w-3.5 mr-1" />{status === "applied" ? (lang === "fr" ? "Envoyé" : "Sent") : t("opp_apply")}
              </Button>
              <Button size="sm" variant="outline" disabled={busyId === o.id || !!status} onClick={() => save(o)}><Bookmark className="h-3.5 w-3.5" /></Button>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
