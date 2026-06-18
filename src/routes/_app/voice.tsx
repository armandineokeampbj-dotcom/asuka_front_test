import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/context/AuthProvider";
import { surveysAPI } from "@/lib/api-client";
import { toast } from "sonner";
import { Mic, ChevronRight, CheckCircle2, Award, MessageSquare, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/_app/voice")({ component: VoicePage });

type Survey = {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr?: string;
  description_en?: string;
  questions: any[];
  reward_xp: number;
  active: boolean;
};

type Filter = "all" | "available" | "done";

function SurveySkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
      <div className="h-5 w-3/4 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-9 w-full rounded-lg bg-muted mt-2" />
    </div>
  );
}

function VoicePage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    if (!user || loaded.current) return;
    loaded.current = true;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [surveysData, responsesData] = await Promise.all([
        surveysAPI.getSurveys(),
        surveysAPI.getResponses(),
      ]);
      const list: Survey[] = (surveysData?.surveys ?? surveysData ?? []).map((s: any) => ({
        ...s,
        id: s._id ?? s.id,
      }));
      setSurveys(list);
      const ids = new Set<string>(
        (responsesData ?? []).map((r: any) => String(r.surveyId ?? r.survey_id ?? ""))
      );
      setCompletedIds(ids);
    } catch {
      toast.error(t("voice_load_error"));
    } finally {
      setLoading(false);
    }
  };

  const getTitle = (s: Survey) => (lang === "fr" ? s.title_fr : s.title_en) || s.title_fr || s.title_en;
  const getDesc = (s: Survey) =>
    (lang === "fr" ? s.description_fr : s.description_en) || s.description_fr || s.description_en;

  const visible = surveys
    .filter((s) => s.active !== false)
    .filter((s) => {
      const done = completedIds.has(s.id);
      if (filter === "available") return !done;
      if (filter === "done") return done;
      return true;
    });

  const doneCount = surveys.filter((s) => completedIds.has(s.id)).length;
  const availableCount = surveys.filter((s) => s.active !== false && !completedIds.has(s.id)).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t("voice_filter_all") },
    { key: "available", label: t("voice_filter_available") },
    { key: "done", label: t("voice_filter_done") },
  ];

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-card p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-aurora opacity-40 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">{t("voice_title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("voice_sub")}</p>
          <div className="mt-5 grid grid-cols-2 gap-4 max-w-xs">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("voice_filter_available")}
              </p>
              <p className="mt-0.5 text-2xl font-bold">{availableCount}</p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("voice_filter_done")}
              </p>
              <p className="mt-0.5 text-2xl font-bold text-success">{doneCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!loading && (
          <span className="ml-auto text-xs text-muted-foreground">
            {visible.length} {t("surveys_word")}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SurveySkeleton key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Mic className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("voice_empty")}</p>
          {filter !== "all" && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setFilter("all")}>
              {t("voice_filter_all")}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visible.map((s) => {
            const done = completedIds.has(s.id);
            const questionCount = s.questions?.length ?? 0;
            return (
              <Link
                key={s.id}
                to="/voice/$surveyId"
                params={{ surveyId: s.id }}
                className={`group block rounded-2xl border bg-card p-5 transition-all ${
                  done
                    ? "opacity-70 border-border/40"
                    : "hover:-translate-y-0.5 hover:shadow-elevated hover:border-primary/30 cursor-pointer border-border/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {questionCount} {t("pulse_questions")}
                    </span>
                    {done && (
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                        {t("voice_completed_badge")}
                      </span>
                    )}
                  </div>
                  <Badge className="bg-accent/15 text-accent border-accent/25 gap-1 shrink-0">
                    <Award className="h-3 w-3" />
                    +{s.reward_xp} XP
                  </Badge>
                </div>
                <h3 className="font-semibold text-base leading-snug mb-1">{getTitle(s)}</h3>
                {getDesc(s) && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{getDesc(s)}</p>
                )}
                <div className="mt-4 flex items-center justify-end">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
