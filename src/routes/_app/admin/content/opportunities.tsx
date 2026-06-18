import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminAPI } from "@/lib/api-client";
import {
  Briefcase, Plus, Loader2, CheckCircle, XCircle, Trash2,
  Pencil, ExternalLink, Bookmark, Users, Search, RefreshCw, Eye, MoreVertical, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/content/opportunities")({ component: OpportunitiesAdminPage });

const TYPES = ["job", "internship", "fellowship", "scholarship", "grant", "competition", "event", "training", "mentorship", "other"];

const emptyForm = {
  title_fr: "", title_en: "",
  organization: "",
  description_fr: "", description_en: "",
  type: "job",
  location: "", country: "",
  remote: false,
  deadline: "",
  link: "",
  emoji: "",
  skills: "",
  tags: "",
  languages: "",
};

type FormState = typeof emptyForm;

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-amber-500/15 border-amber-500/30 text-foreground",
  approved: "bg-success/15 border-success/30 text-foreground",
  rejected: "bg-destructive/15 border-destructive/30 text-foreground",
};

const STATUS_KEYS: Record<string, string> = {
  pending: "admin_status_pending",
  approved: "admin_status_approved",
  rejected: "admin_status_rejected",
};

function toArr(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function fromArr(v: any): string {
  if (!Array.isArray(v)) return "";
  return v.join(", ");
}

function oppToForm(o: any): FormState {
  return {
    title_fr: o.title_fr ?? o.title ?? "",
    title_en: o.title_en ?? "",
    organization: o.organization ?? "",
    description_fr: o.description_fr ?? o.description ?? "",
    description_en: o.description_en ?? "",
    type: o.type ?? "job",
    location: o.location ?? "",
    country: o.country ?? "",
    remote: o.remote ?? false,
    deadline: o.deadline ?? "",
    link: o.link ?? "",
    emoji: o.emoji ?? "",
    skills: fromArr(o.skills),
    tags: fromArr(o.tags),
    languages: fromArr(o.languages),
  };
}

function formToPayload(f: FormState) {
  return {
    title_fr: f.title_fr,
    title_en: f.title_en,
    title: f.title_fr || f.title_en,
    organization: f.organization,
    description_fr: f.description_fr,
    description_en: f.description_en,
    description: f.description_fr,
    type: f.type,
    location: f.location,
    country: f.country,
    remote: f.remote,
    deadline: f.deadline,
    link: f.link,
    emoji: f.emoji,
    skills: toArr(f.skills),
    tags: toArr(f.tags),
    languages: toArr(f.languages),
  };
}

function OpportunitiesAdminPage() {
  const { t } = useLang();
  const { canEdit, canApprove, canDelete, isReader } = useAdminPermissions();
  const [opps, setOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "views" | "applied" | "deadline">("date");

  const load = () => {
    setLoading(true);
    adminAPI.getOpportunities()
      .then((data: any) => setOpps(data?.opportunities ?? []))
      .catch(() => { toast.error(t("admin_opp_err")); setOpps([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const uniqueCountries = [...new Set(opps.map((o) => o.country).filter(Boolean) as string[])].sort();
  const uniqueOrgs = [...new Set(opps.map((o) => o.organization).filter(Boolean) as string[])].sort();

  const filtered = opps
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) => !filterCountry || o.country === filterCountry)
    .filter((o) => !filterType || o.type === filterType)
    .filter((o) => !filterOrg || o.organization === filterOrg)
    .filter((o) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (o.title_fr ?? "").toLowerCase().includes(q)
        || (o.title_en ?? "").toLowerCase().includes(q)
        || (o.organization ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "views") return (b.views_count ?? 0) - (a.views_count ?? 0);
      if (sortBy === "applied") return (b.stats?.applied ?? 0) - (a.stats?.applied ?? 0);
      if (sortBy === "deadline") {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }
      return 0;
    });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialog(true);
  };

  const openEdit = (o: any) => {
    setEditId(o._id ?? o.id);
    setForm(oppToForm(o));
    setDialog(true);
  };

  const save = async () => {
    if (!form.title_fr && !form.title_en) return toast.error(t("admin_no_data"));
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (editId) {
        await adminAPI.updateOpportunity(editId, payload);
        toast.success(t("admin_opp_updated"));
      } else {
        await adminAPI.createOpportunity(payload);
        toast.success(t("admin_opp_created"));
      }
      setDialog(false);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setStatusLoading(id + status);
    try {
      await adminAPI.updateOpportunityStatus(id, status);
      toast.success(t(STATUS_KEYS[status] ?? "admin_status_pending"));
      setOpps((prev) => prev.map((o) => (o._id === id || o.id === id) ? { ...o, status } : o));
    } catch {
      toast.error(t("admin_err"));
    } finally {
      setStatusLoading(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette opportunité ?")) return;
    try {
      await adminAPI.deleteOpportunity(id);
      toast.success(t("admin_opp_deleted"));
      setOpps((prev) => prev.filter((o) => o._id !== id && o.id !== id));
    } catch {
      toast.error(t("admin_err"));
    }
  };

  const duplicate = async (o: any) => {
    try {
      const payload = formToPayload(oppToForm(o));
      payload.title_fr = payload.title_fr ? `${payload.title_fr} (copie)` : payload.title_fr;
      payload.title = payload.title_fr || payload.title_en;
      await adminAPI.createOpportunity(payload);
      toast.success(t("admin_opp_duplicated"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  // Summary counts
  const counts = { all: opps.length, pending: 0, approved: 0, rejected: 0 };
  for (const o of opps) { if (o.status in counts) (counts as any)[o.status]++; }

  const f = (key: keyof FormState, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Briefcase className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{t("admin_nav_opportunities")}</h1>
          {isReader && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
              {t("admin_readonly_badge")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={load} title="Rafraîchir">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {canEdit && (
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("admin_create")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-xl border p-3 text-left transition hover:border-primary/40 ${filter === s ? "border-primary/60 bg-primary/5" : "border-border bg-card"}`}
          >
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {s === "all" ? t("admin_all") : t(STATUS_KEYS[s] ?? s)}
            </div>
          </button>
        ))}
      </div>

      {/* Search + filtres */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("admin_opp_search_placeholder")}
            className="pl-9 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="h-8 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">{t("admin_filter_all_types")}</option>
            {TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
          </select>
          {uniqueCountries.length > 0 && (
            <select
              className="h-8 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
            >
              <option value="">{t("opp_filter_all_countries")}</option>
              {uniqueCountries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {uniqueOrgs.length > 0 && (
            <select
              className="h-8 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
            >
              <option value="">{t("opp_filter_all_orgs")}</option>
              {uniqueOrgs.map((org) => <option key={org} value={org}>{org}</option>)}
            </select>
          )}
          {(filterType || filterCountry || filterOrg) && (
            <button
              onClick={() => { setFilterType(""); setFilterCountry(""); setFilterOrg(""); }}
              className="h-8 px-3 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground transition"
            >
              {t("opp_filter_reset")}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} / {opps.length}
            </span>
            <select
              className="h-8 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">{t("admin_sort_date")}</option>
              <option value="views">{t("admin_sort_views")}</option>
              <option value="applied">{t("admin_sort_applied")}</option>
              <option value="deadline">{t("admin_sort_deadline")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste moderne */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("admin_loading")}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          {t("admin_opp_no_data")}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const id = o._id ?? o.id;
            const statusBar = o.status === "approved" ? "bg-success" : o.status === "rejected" ? "bg-destructive" : "bg-amber-400";
            return (
              <div
                key={id}
                className="group relative flex items-center gap-4 rounded-xl border border-border/50 bg-card px-4 py-3.5 transition-all hover:border-primary/25 hover:shadow-sm"
              >
                {/* Barre de statut gauche */}
                <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${statusBar}`} />

                {/* Emoji */}
                <div className="pl-2 text-2xl w-8 shrink-0 text-center">
                  {o.emoji || <Briefcase className="h-4 w-4 text-muted-foreground mx-auto" />}
                </div>

                {/* Titre + org */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm leading-snug">{o.title_fr || o.title_en || "—"}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {o.organization && <span className="text-xs text-muted-foreground truncate">{o.organization}</span>}
                    {o.location && <span className="text-xs text-muted-foreground/50">· {o.location}{o.remote ? " · Remote" : ""}</span>}
                  </div>
                </div>

                {/* Type */}
                <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">{o.type}</Badge>

                {/* Statut */}
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[o.status] ?? ""}`}>
                  {t(STATUS_KEYS[o.status] ?? o.status)}
                </Badge>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1" title="Vues">
                    <Eye className="h-3 w-3" /> {o.views_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1" title="Favoris">
                    <Bookmark className="h-3 w-3" /> {o.stats?.saved ?? 0}
                  </span>
                  <span className="flex items-center gap-1" title="Candidatures">
                    <Users className="h-3 w-3" /> {o.stats?.applied ?? 0}
                  </span>
                </div>

                {/* Deadline */}
                <div className="hidden lg:block text-xs text-muted-foreground shrink-0 w-20 text-right">
                  {o.deadline ? new Date(o.deadline).toLocaleDateString("fr-FR") : "—"}
                </div>

                {/* Menu */}
                {(canEdit || canApprove || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {statusLoading?.startsWith(id)
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <MoreVertical className="h-3.5 w-3.5" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <a href={`/opportunities/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5" /> {t("admin_opp_view_public")}
                        </a>
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => openEdit(o)} className="gap-2">
                            <Pencil className="h-3.5 w-3.5" /> {t("admin_edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate(o)} className="gap-2">
                            <Copy className="h-3.5 w-3.5" /> {t("admin_opp_duplicate")}
                          </DropdownMenuItem>
                        </>
                      )}
                      {canApprove && (
                        <>
                          <DropdownMenuSeparator />
                          {o.status !== "approved" && (
                            <DropdownMenuItem onClick={() => setStatus(id, "approved")} className="gap-2 text-success focus:text-success">
                              <CheckCircle className="h-3.5 w-3.5" /> {t("admin_opp_approve")}
                            </DropdownMenuItem>
                          )}
                          {o.status !== "rejected" && (
                            <DropdownMenuItem onClick={() => setStatus(id, "rejected")} className="gap-2 text-destructive focus:text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> {t("admin_opp_reject")}
                            </DropdownMenuItem>
                          )}
                          {o.status !== "pending" && (
                            <DropdownMenuItem onClick={() => setStatus(id, "pending")} className="gap-2 text-amber-500 focus:text-amber-500">
                              <RefreshCw className="h-3.5 w-3.5" /> {t("admin_opp_set_pending")}
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => remove(id)} className="gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> {t("admin_delete")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog créer / modifier */}
      <Dialog open={dialog} onOpenChange={(o) => { if (!o) setDialog(false); }}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editId ? t("admin_opp_edit_title") : t("admin_opp_create_title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            {/* Titres */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Titre (FR) *</label>
                <Input placeholder="Titre en français" value={form.title_fr} onChange={(e) => f("title_fr", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title (EN)</label>
                <Input placeholder="Title in English" value={form.title_en} onChange={(e) => f("title_en", e.target.value)} />
              </div>
            </div>

            {/* Structure responsable + Emoji */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Structure responsable</label>
                <Input placeholder="Ex : AMPBENIN, PNUD, UNESCO…" value={form.organization} onChange={(e) => f("organization", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Emoji</label>
                <Input placeholder="🎓" value={form.emoji} onChange={(e) => f("emoji", e.target.value)} />
              </div>
            </div>

            {/* Type + Remote + Deadline */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_col_type")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.type}
                  onChange={(e) => f("type", e.target.value)}
                >
                  {TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
                <Input type="date" value={form.deadline} onChange={(e) => f("deadline", e.target.value)} />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.remote}
                    onChange={(e) => f("remote", e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Remote
                </label>
              </div>
            </div>

            {/* Lieu + Pays */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_opp_field_location")}</label>
                <Input placeholder="Cotonou, Bénin" value={form.location} onChange={(e) => f("location", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Pays</label>
                <Input placeholder="Bénin" value={form.country} onChange={(e) => f("country", e.target.value)} />
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description (FR)</label>
              <Textarea placeholder="Description en français…" rows={3} value={form.description_fr} onChange={(e) => f("description_fr", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description (EN)</label>
              <Textarea placeholder="Description in English…" rows={3} value={form.description_en} onChange={(e) => f("description_en", e.target.value)} />
            </div>

            {/* Lien externe */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin_opp_field_url")}</label>
              <Input placeholder="https://example.com/apply" value={form.link} onChange={(e) => f("link", e.target.value)} />
            </div>

            {/* Skills / Tags / Languages */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Skills <span className="opacity-50">(virgule)</span></label>
                <Input placeholder="Python, Leadership…" value={form.skills} onChange={(e) => f("skills", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tags <span className="opacity-50">(virgule)</span></label>
                <Input placeholder="Afrique, Tech…" value={form.tags} onChange={(e) => f("tags", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Langues <span className="opacity-50">(virgule)</span></label>
                <Input placeholder="fr, en…" value={form.languages} onChange={(e) => f("languages", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>{t("admin_cancel")}</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {editId ? t("admin_save") : t("admin_create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
