import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminAPI } from "@/lib/api-client";
import {
  Radio, Plus, Loader2, Trash2, MoreVertical, Copy, Pencil,
  ToggleLeft, ToggleRight, ExternalLink, Search, Globe, Lock, EyeOff, UserCheck, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/content/pulses")({ component: PulsesAdminPage });

type QuestionType = { text_fr: string; text_en: string; options: string[] };
const emptyQ = (): QuestionType => ({ text_fr: "", text_en: "", options: ["", ""] });

const emptyForm = {
  title_fr: "", title_en: "",
  description_fr: "", description_en: "",
  questions: [emptyQ()],
  reward_xp: 10,
  active: true,
  is_public: true,
  is_anonymous: true,
  age_restriction_enabled: false,
  age_min: "",
  age_max: "",
  gender_restriction_enabled: false,
  gender_restriction: "" as "male" | "female" | "",
};

type FormType = typeof emptyForm;

function PulseSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 animate-pulse flex gap-4">
      <div className="w-1 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
    </div>
  );
}

function PulsesAdminPage() {
  const { t } = useLang();
  const { canEdit, canDelete } = useAdminPermissions();
  const [pulses, setPulses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormType>(emptyForm);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);

  const load = () => {
    setLoading(true);
    adminAPI.getSurveys()
      .then((data: any) => setPulses(data?.surveys ?? (Array.isArray(data) ? data : [])))
      .catch(() => toast.error(t("admin_pulse_err")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    load();
  }, []);

  /* form helpers */
  const setQ = (i: number, patch: Partial<QuestionType>) => {
    const qs = [...form.questions];
    qs[i] = { ...qs[i], ...patch };
    setForm({ ...form, questions: qs });
  };
  const setOption = (qi: number, oi: number, val: string) => {
    const qs = [...form.questions];
    const opts = [...qs[qi].options];
    opts[oi] = val;
    qs[qi] = { ...qs[qi], options: opts };
    setForm({ ...form, questions: qs });
  };
  const addOption = (qi: number) => {
    const qs = [...form.questions];
    qs[qi] = { ...qs[qi], options: [...qs[qi].options, ""] };
    setForm({ ...form, questions: qs });
  };
  const removeOption = (qi: number, oi: number) => {
    const qs = [...form.questions];
    qs[qi] = { ...qs[qi], options: qs[qi].options.filter((_, i) => i !== oi) };
    setForm({ ...form, questions: qs });
  };
  const addQuestion = () => setForm({ ...form, questions: [...form.questions, emptyQ()] });
  const removeQuestion = (i: number) => setForm({ ...form, questions: form.questions.filter((_, idx) => idx !== i) });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialog("create");
  };

  const openEdit = (p: any) => {
    setEditId(p._id ?? p.id);
    setForm({
      title_fr: p.title_fr ?? "",
      title_en: p.title_en ?? "",
      description_fr: p.description_fr ?? "",
      description_en: p.description_en ?? "",
      questions: (p.questions ?? []).map((q: any) => ({
        text_fr: q.text_fr ?? "",
        text_en: q.text_en ?? "",
        options: q.options?.length ? q.options : ["", ""],
      })),
      reward_xp: p.reward_xp ?? 10,
      active: p.active !== false,
      is_public: p.is_public !== false,
      is_anonymous: p.is_anonymous !== false,
      age_restriction_enabled: p.age_min != null || p.age_max != null,
      age_min: p.age_min != null ? String(p.age_min) : "",
      age_max: p.age_max != null ? String(p.age_max) : "",
      gender_restriction_enabled: !!p.gender_restriction,
      gender_restriction: p.gender_restriction ?? "",
    });
    setDialog("edit");
  };

  const buildPayload = () => ({
    title_fr: form.title_fr,
    title_en: form.title_en,
    description_fr: form.description_fr,
    description_en: form.description_en,
    questions: form.questions,
    reward_xp: form.reward_xp,
    active: form.active,
    is_public: form.is_public,
    is_anonymous: form.is_anonymous,
    age_min: form.age_restriction_enabled && form.age_min !== "" ? Number(form.age_min) : null,
    age_max: form.age_restriction_enabled && form.age_max !== "" ? Number(form.age_max) : null,
    gender_restriction: form.gender_restriction_enabled ? form.gender_restriction || null : null,
  });

  const save = async () => {
    if (!form.title_fr && !form.title_en) return toast.error(t("admin_no_data"));
    if (form.questions.some((q) => !q.text_fr && !q.text_en)) return toast.error(t("admin_pulse_q_err"));
    if (form.age_restriction_enabled && form.age_min !== "" && form.age_max !== "") {
      if (Number(form.age_min) >= Number(form.age_max)) {
        return toast.error("L'âge minimum doit être inférieur à l'âge maximum.");
      }
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (dialog === "edit" && editId) {
        await adminAPI.updateSurvey(editId, payload);
        toast.success(t("admin_pulse_updated"));
      } else {
        await adminAPI.createSurvey(payload);
        toast.success(t("admin_pulse_created"));
      }
      setDialog(null);
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce pulse ?")) return;
    try {
      await adminAPI.deleteSurvey(id);
      toast.success(t("admin_pulse_deleted"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  const duplicate = async (p: any) => {
    const payload = {
      ...buildPayload(),
      title_fr: p.title_fr ? `${p.title_fr} (copie)` : p.title_fr,
      title_en: p.title_en ? `${p.title_en} (copy)` : p.title_en,
      active: false,
    };
    try {
      await adminAPI.createSurvey(payload);
      toast.success(t("admin_pulse_duplicated"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  const toggleActive = async (p: any) => {
    const id = p._id ?? p.id;
    try {
      await adminAPI.updateSurvey(id, { active: !p.active });
      toast.success(p.active ? t("admin_pulse_deactivate") : t("admin_pulse_activate"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  const filtered = pulses.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.title_fr ?? "").toLowerCase().includes(q) || (p.title_en ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          {t("admin_nav_pulses")}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({filtered.length}{filtered.length !== pulses.length ? `/${pulses.length}` : ""})
          </span>
        </h1>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {t("admin_pulse_create")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("admin_pulse_search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => <PulseSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground border-dashed">
          {t("admin_pulse_no_data")}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => {
            const id = p._id ?? p.id;
            const questions = p.questions ?? [];
            const isActive = p.active !== false;
            const isPublic = p.is_public !== false;
            const isAnon = p.is_anonymous !== false;
            return (
              <Card key={id} className="p-0 overflow-hidden">
                <div className="flex items-center gap-0">
                  <div className={`w-1 self-stretch shrink-0 ${isActive ? "bg-success" : "bg-muted-foreground/30"}`} />
                  <div className="flex flex-1 items-center gap-4 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <Link
                          to="/admin/content/pulses/$surveyId"
                          params={{ surveyId: id }}
                          className="font-semibold text-sm truncate hover:text-primary transition-colors"
                        >
                          {p.title_fr || p.title_en}
                        </Link>
                        <Badge className={`text-[10px] ${isActive ? "bg-success/15 border-success/30 text-foreground" : "bg-muted text-muted-foreground"}`}>
                          {isActive ? t("admin_status_active") : t("admin_status_inactive")}
                        </Badge>
                        {!isPublic && (
                          <Badge className="text-[10px] bg-amber-500/15 border-amber-500/30 text-amber-700 gap-0.5">
                            <Lock className="h-2.5 w-2.5" /> {t("survey_private_message").replace(".", "").split(" ").pop()}
                          </Badge>
                        )}
                        {!isAnon && (
                          <Badge className="text-[10px] bg-blue-500/15 border-blue-500/30 text-blue-700 gap-0.5">
                            <UserCheck className="h-2.5 w-2.5" /> Nominatif
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
                        <span>+{p.reward_xp ?? 0} XP</span>
                        {(p.age_min != null || p.age_max != null) && (
                          <span>{p.age_min ?? "?"}-{p.age_max ?? "?"} ans</span>
                        )}
                        {p.gender_restriction && (
                          <span>{p.gender_restriction === "male" ? t("survey_gender_male") : t("survey_gender_female")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem asChild>
                              <Link
                                to="/admin/content/pulses/$surveyId"
                                params={{ surveyId: id }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <BarChart3 className="h-3.5 w-3.5" />
                                {t("admin_pulse_view_responses")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/voice" className="flex items-center gap-2 cursor-pointer">
                                <ExternalLink className="h-3.5 w-3.5" />
                                {t("admin_pulse_view_user")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2">
                              <Pencil className="h-3.5 w-3.5" />
                              {t("admin_edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(p)} className="gap-2">
                              <Copy className="h-3.5 w-3.5" />
                              {t("admin_pulse_duplicate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(p)} className="gap-2">
                              {isActive
                                ? <><ToggleLeft className="h-3.5 w-3.5" /> {t("admin_pulse_deactivate")}</>
                                : <><ToggleRight className="h-3.5 w-3.5" /> {t("admin_pulse_activate")}</>
                              }
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => remove(id)} className="gap-2 text-destructive focus:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t("admin_delete")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) { setDialog(null); setEditId(null); } }}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {dialog === "edit" ? t("admin_pulse_edit_title") : t("admin_pulse_create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">

            {/* Title / Description */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t("admin_field_title_fr")} value={form.title_fr} onChange={(e) => setForm({ ...form, title_fr: e.target.value })} />
                <Input placeholder={t("admin_field_title_en")} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Textarea placeholder={t("admin_field_desc_fr")} rows={2} value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} />
                <Textarea placeholder={t("admin_field_desc_en")} rows={2} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
              </div>
            </div>

            {/* XP + Active */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">{t("admin_pulse_field_xp")}</Label>
                <Input type="number" min={0} value={form.reward_xp} onChange={(e) => setForm({ ...form, reward_xp: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label htmlFor="active" className="text-sm cursor-pointer">{t("admin_pulse_field_active")}</Label>
              </div>
            </div>

            {/* Access & Collection toggles */}
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accès & Collecte</p>

              {/* is_public */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {form.is_public ? <Globe className="h-4 w-4 text-success" /> : <Lock className="h-4 w-4 text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium">{t("survey_public_toggle")}</p>
                    <p className="text-xs text-muted-foreground">{t("survey_public_desc")}</p>
                  </div>
                </div>
                <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
              </div>

              {/* is_anonymous */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {form.is_anonymous ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <UserCheck className="h-4 w-4 text-blue-500" />}
                  <div>
                    <p className="text-sm font-medium">{t("survey_anon_toggle")}</p>
                    <p className="text-xs text-muted-foreground">{t("survey_anon_desc")}</p>
                  </div>
                </div>
                <Switch checked={form.is_anonymous} onCheckedChange={(v) => setForm({ ...form, is_anonymous: v })} />
              </div>
            </div>

            {/* Conditions accordion */}
            <Accordion type="single" collapsible className="border border-border/50 rounded-xl overflow-hidden">
              <AccordionItem value="conditions" className="border-none">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                  {t("survey_conditions")}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">

                  {/* Age restriction */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="age-toggle"
                        checked={form.age_restriction_enabled}
                        onCheckedChange={(v) => setForm({ ...form, age_restriction_enabled: v, age_min: v ? form.age_min : "", age_max: v ? form.age_max : "" })}
                      />
                      <Label htmlFor="age-toggle" className="text-sm cursor-pointer">{t("survey_age_restriction")}</Label>
                    </div>
                    {form.age_restriction_enabled && (
                      <div className="grid grid-cols-2 gap-2 pl-8">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("survey_age_min")}</Label>
                          <Input
                            type="number" min={0} max={120}
                            placeholder="ex: 18"
                            value={form.age_min}
                            onChange={(e) => setForm({ ...form, age_min: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("survey_age_max")}</Label>
                          <Input
                            type="number" min={0} max={120}
                            placeholder="ex: 35"
                            value={form.age_max}
                            onChange={(e) => setForm({ ...form, age_max: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gender restriction */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="gender-toggle"
                        checked={form.gender_restriction_enabled}
                        onCheckedChange={(v) => setForm({ ...form, gender_restriction_enabled: v, gender_restriction: v ? form.gender_restriction : "" })}
                      />
                      <Label htmlFor="gender-toggle" className="text-sm cursor-pointer">{t("survey_gender_restriction")}</Label>
                    </div>
                    {form.gender_restriction_enabled && (
                      <div className="pl-8">
                        <Select
                          value={form.gender_restriction}
                          onValueChange={(v) => setForm({ ...form, gender_restriction: v as "male" | "female" })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t("survey_gender_male")}</SelectItem>
                            <SelectItem value="female">{t("survey_gender_female")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t("admin_pulse_questions_label")}</h4>
                <Button size="sm" variant="outline" onClick={addQuestion} className="text-xs h-7 gap-1">
                  <Plus className="h-3 w-3" /> {t("admin_pulse_add_question")}
                </Button>
              </div>
              {form.questions.map((q, qi) => (
                <Card key={qi} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Question {qi + 1}</span>
                    {form.questions.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeQuestion(qi)} className="h-6 text-xs text-destructive">
                        {t("admin_delete")}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={t("admin_pulse_q_fr")} value={q.text_fr} onChange={(e) => setQ(qi, { text_fr: e.target.value })} />
                    <Input placeholder={t("admin_pulse_q_en")} value={q.text_en} onChange={(e) => setQ(qi, { text_en: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("admin_pulse_options")}</Label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-1.5">
                        <Input
                          placeholder={`Option ${oi + 1}`}
                          value={opt}
                          onChange={(e) => setOption(qi, oi, e.target.value)}
                          className="text-xs h-8"
                        />
                        {q.options.length > 2 && (
                          <Button size="sm" variant="ghost" onClick={() => removeOption(qi, oi)} className="h-8 w-8 p-0">
                            <XIcon />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addOption(qi)} className="text-xs h-7 gap-1">
                      <Plus className="h-3 w-3" /> Option
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); setEditId(null); }}>{t("admin_cancel")}</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("admin_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 1l10 10M11 1L1 11" />
    </svg>
  );
}
