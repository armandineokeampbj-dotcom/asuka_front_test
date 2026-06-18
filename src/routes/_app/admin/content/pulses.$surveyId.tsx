import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminAPI } from "@/lib/api-client";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useLang } from "@/i18n/LanguageProvider";
import {
  ArrowLeft, FileSpreadsheet, Trash2, Loader2, Users, Zap, Clock,
  Globe, Lock, EyeOff, UserCheck, BarChart3, CalendarDays,
  Radio, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/content/pulses/$surveyId")({
  component: SurveyAnalyticsPage,
});

type QuestionStat = {
  id: string;
  text_fr: string;
  text_en: string;
  answered: number;
  options: { label: string; count: number; percentage: number }[];
};

type ResponseRow = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  respondent_name: string | null;
  respondent_firstname: string | null;
  respondent_email: string | null;
  respondent_phone: string | null;
  ip_hash: string | null;
  answers: Record<string, string>;
  reward: number;
  createdAt: string;
  updatedAt: string | null;
};

type AnalyticsData = {
  survey: any;
  stats: {
    total: number;
    totalXP: number;
    lastResponse: string | null;
    timeline: { date: string; count: number }[];
    byQuestion: QuestionStat[];
  };
  responses: ResponseRow[];
};

/* ─── Palette for option bars ───────────────────────────────────────────── */
const COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500",
];
const TEXT_COLORS = [
  "text-violet-600", "text-sky-600", "text-emerald-600", "text-amber-600",
  "text-rose-600", "text-cyan-600", "text-orange-600", "text-indigo-600",
];

/* ─── Custom tooltip for the area chart ─────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">{payload[0].value} réponse{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

/* ─── KPI card ───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <Card className="p-4 sm:p-5 border-border/40 bg-gradient-card flex items-center gap-3 sm:gap-4">
      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-lg sm:text-2xl font-bold text-foreground mt-0.5 leading-none truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
      </div>
    </Card>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
function SurveyAnalyticsPage() {
  const { surveyId } = Route.useParams();
  const { t, lang } = useLang();
  const { canDelete } = useAdminPermissions();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const loaded = useRef(false);

  const load = () => {
    setLoading(true);
    adminAPI.getSurveyResponses(surveyId)
      .then((d: any) => setData(d))
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    load();
  }, [surveyId]);

  /* Excel export */
  const exportXlsx = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      await adminAPI.exportSurveyXlsx(
        surveyId,
        data.survey.title_fr || data.survey.title_en || "sondage"
      );
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setExporting(false);
    }
  };

  const deleteResponse = async (responseId: string) => {
    if (!confirm(t("admin_responses_delete_confirm"))) return;
    setDeletingId(responseId);
    try {
      await adminAPI.deleteSurveyResponse(surveyId, responseId);
      toast.success("Réponse supprimée");
      setData((prev) =>
        prev ? { ...prev, responses: prev.responses.filter((r) => r.id !== responseId) } : prev
      );
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  /* helpers */
  const surveyTitle = (s: any) =>
    (lang === "fr" ? s.title_fr : s.title_en) || s.title_fr || s.title_en || "—";

  const respondentLabel = (r: ResponseRow) => {
    if (r.userName) return r.userName;
    if (r.respondent_firstname || r.respondent_name)
      return `${r.respondent_firstname ?? ""} ${r.respondent_name ?? ""}`.trim();
    if (r.ip_hash) return r.ip_hash;
    return t("admin_responses_anon_label");
  };

  const respondentEmail = (r: ResponseRow) => r.userEmail || r.respondent_email || null;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Sondage introuvable.
      </div>
    );
  }

  const { survey, stats, responses } = data;
  const questions: any[] = (survey.questions ?? []).map((q: any, qi: number) => ({
    ...q,
    _key: q.id ?? String(q._id ?? qi),
  }));
  const isAnon = survey.is_anonymous !== false;

  /* Max responses in timeline (for y-axis) */
  const maxCount = Math.max(...stats.timeline.map((d) => d.count), 1);

  return (
    <div className="space-y-7 pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 mt-0.5 shrink-0">
            <Link to="/admin/content/pulses">
              <ArrowLeft className="h-4 w-4" />
              {t("admin_responses_back")}
            </Link>
          </Button>
        </div>
        <div className="flex-1 min-w-0 px-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Radio className="h-4 w-4 text-primary shrink-0" />
            <h1 className="text-xl font-bold truncate">{surveyTitle(survey)}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] ${survey.active ? "bg-success/15 border-success/30 text-foreground" : "bg-muted text-muted-foreground"}`}>
              {survey.active ? "Actif" : "Inactif"}
            </Badge>
            {survey.is_public !== false
              ? <Badge className="text-[10px] bg-emerald-500/10 border-emerald-500/20 text-emerald-700 gap-1"><Globe className="h-2.5 w-2.5" />Public</Badge>
              : <Badge className="text-[10px] bg-amber-500/10 border-amber-500/20 text-amber-700 gap-1"><Lock className="h-2.5 w-2.5" />Privé</Badge>
            }
            {isAnon
              ? <Badge className="text-[10px] bg-muted text-muted-foreground gap-1"><EyeOff className="h-2.5 w-2.5" />Anonyme</Badge>
              : <Badge className="text-[10px] bg-blue-500/10 border-blue-500/20 text-blue-700 gap-1"><UserCheck className="h-2.5 w-2.5" />Nominatif</Badge>
            }
            <span className="text-xs text-muted-foreground">
              {stats.total} {t("admin_responses_response_count")}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={exportXlsx}
          className="gap-1.5 shrink-0"
          disabled={stats.total === 0 || exporting}
        >
          {exporting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
          }
          {exporting ? "Export en cours…" : t("admin_responses_export")}
        </Button>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label={t("admin_responses_total")}
          value={stats.total}
          icon={Users}
        />
        <KpiCard
          label={t("admin_responses_xp_dist")}
          value={stats.totalXP}
          icon={Zap}
          sub={`${survey.reward_xp ?? 0} XP / réponse`}
        />
        <KpiCard
          label={t("admin_responses_last")}
          value={stats.lastResponse
            ? format(new Date(stats.lastResponse), "dd MMM yyyy", { locale: fr })
            : t("admin_responses_never")}
          icon={Clock}
        />
        <KpiCard
          label="Questions"
          value={questions.length}
          icon={Radio}
          sub={`${survey.age_min ?? ""}${survey.age_min && survey.age_max ? "-" : ""}${survey.age_max ?? ""}${(survey.age_min || survey.age_max) ? " ans" : "Toutes tranches"}`}
        />
      </div>

      {/* ── Timeline area chart ───────────────────────────────────────────── */}
      <Card className="p-5 border-border/40 bg-gradient-card">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("admin_responses_timeline")}</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {stats.timeline.reduce((s, d) => s + d.count, 0)} total
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(d) => {
                const dt = new Date(d);
                return `${dt.getDate()}/${dt.getMonth() + 1}`;
              }}
              interval={6}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              domain={[0, maxCount + 1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorResponses)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Per-question breakdown ────────────────────────────────────────── */}
      {stats.byQuestion.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("admin_responses_by_question")}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.byQuestion.map((q, qi) => (
              <Card key={q.id || qi} className="p-5 border-border/40 bg-gradient-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Q{qi + 1}
                </p>
                <p className="text-sm font-semibold mb-4 leading-snug">
                  {lang === "fr" ? q.text_fr : q.text_en || q.text_fr}
                </p>
                <div className="space-y-3">
                  {q.options.map((opt, oi) => (
                    <div key={oi}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={`font-medium truncate max-w-[70%] ${TEXT_COLORS[oi % TEXT_COLORS.length]}`}>
                          {opt.label}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {opt.count} <span className="opacity-60">({opt.percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${COLORS[oi % COLORS.length]} transition-all duration-700`}
                          style={{ width: `${opt.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {q.answered < stats.total && (
                  <p className="text-[10px] text-muted-foreground mt-3">
                    {stats.total - q.answered} sans réponse à cette question
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Response table ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("admin_responses_list")}</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {responses.length} {t("admin_responses_response_count")}
          </span>
        </div>

        {responses.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground border-dashed text-sm">
            {t("admin_responses_none")}
          </Card>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
            {/* Table header */}
            <div className="grid gap-0 border-b border-border/50 bg-muted/30">
              <div
                className="grid items-center gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                style={{ gridTemplateColumns: `1fr 1fr ${questions.map(() => "1fr").join(" ")} 80px 120px ${canDelete ? "40px" : ""}` }}
              >
                <span>{isAnon ? t("admin_responses_anon_label") : "Répondant"}</span>
                <span>Contact</span>
                {questions.map((q: any, qi: number) => (
                  <span key={q._key} className="truncate">Q{qi + 1}</span>
                ))}
                <span>XP</span>
                <span>{t("admin_responses_answered_at")}</span>
                {canDelete && <span />}
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/30">
              {responses.map((r) => (
                <div
                  key={r.id}
                  className="grid items-center gap-3 px-4 py-3 text-xs hover:bg-muted/20 transition-colors"
                  style={{ gridTemplateColumns: `1fr 1fr ${questions.map(() => "1fr").join(" ")} 80px 120px ${canDelete ? "40px" : ""}` }}
                >
                  {/* Respondent */}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{respondentLabel(r)}</p>
                    {r.respondent_phone && (
                      <p className="text-muted-foreground truncate">{r.respondent_phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="min-w-0">
                    {respondentEmail(r)
                      ? <p className="text-muted-foreground truncate">{respondentEmail(r)}</p>
                      : <span className="text-muted-foreground/50">—</span>
                    }
                  </div>

                  {/* One cell per question */}
                  {questions.map((q: any) => (
                    <div key={q._key} className="min-w-0">
                      <span className="truncate block text-foreground/80">
                        {r.answers[q._key] || <span className="text-muted-foreground/40">—</span>}
                      </span>
                    </div>
                  ))}

                  {/* XP */}
                  <div>
                    <Badge className="text-[10px] bg-accent/10 border-accent/20 text-accent-foreground gap-0.5">
                      <Zap className="h-2.5 w-2.5" />
                      {r.reward}
                    </Badge>
                  </div>

                  {/* Date */}
                  <div className="text-muted-foreground tabular-nums">
                    {format(new Date(r.createdAt), "dd/MM/yy HH:mm")}
                    {r.updatedAt && (
                      <span className="block text-[10px] text-primary/60">
                        Modifié {format(new Date(r.updatedAt), "dd/MM")}
                      </span>
                    )}
                  </div>

                  {/* Delete */}
                  {canDelete && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteResponse(r.id)}
                        disabled={deletingId === r.id}
                      >
                        {deletingId === r.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
