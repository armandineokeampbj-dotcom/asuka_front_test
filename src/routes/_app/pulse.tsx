import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/i18n/LanguageProvider";
import { Radio, TrendingUp, Sparkles, CheckCircle2, ArrowLeft, ArrowRight, Award, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { awardXp, awardBadgeIfMissing } from "@/lib/asuka-actions";
import { pulsesAPI } from "@/lib/api-client";

export const Route = createFileRoute("/_app/pulse")({ component: PulsePage });

type PulseOption = { id: string; label: { fr: string; en: string } };
type PulseQuestion = {
  id: string;
  prompt_fr: string;
  prompt_en: string;
  options: PulseOption[];
};
type PulseRow = {
  id: string;
  topic_fr: string;
  topic_en: string;
  question_fr: string;
  question_en: string;
  options: PulseOption[];
  questions: PulseQuestion[];
  reward_points: number;
};

type PulseFilter = "all" | "todo" | "done";

function getTranslation(translations: { fr: string; en: string }, lang: string): string {
  return (translations as any)[lang] || translations.en || translations.fr;
}

function normalize(p: any): PulseRow {
  const questions: PulseQuestion[] = (() => {
    if (Array.isArray(p.questions) && p.questions.length) {
      return p.questions.map((q: any) => ({
        id: q.id ?? q._id ?? Math.random().toString(36).slice(2),
        prompt_fr: q.prompt_fr ?? q.text_fr ?? q.text ?? "",
        prompt_en: q.prompt_en ?? q.text_en ?? q.text ?? "",
        options: (q.options ?? []).map((opt: any): PulseOption => {
          if (typeof opt === "string") return { id: opt, label: { fr: opt, en: opt } };
          return opt;
        }),
      }));
    }
    return [{
      id: "q1",
      prompt_fr: p.question_fr ?? p.description_fr ?? "",
      prompt_en: p.question_en ?? p.description_en ?? "",
      options: (p.options ?? []).map((opt: any): PulseOption => {
        if (typeof opt === "string") return { id: opt, label: { fr: opt, en: opt } };
        return opt;
      }),
    }];
  })();
  return {
    ...p,
    id: p._id ?? p.id,
    topic_fr: p.topic_fr ?? p.title_fr ?? "",
    topic_en: p.topic_en ?? p.title_en ?? "",
    question_fr: p.question_fr ?? p.description_fr ?? "",
    question_en: p.question_en ?? p.description_en ?? "",
    options: p.options ?? [],
    questions,
    reward_points: p.reward_points ?? p.reward_xp ?? 15,
  };
}

function PulseSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-6 animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-4 w-20 rounded-full bg-muted" />
        <div className="h-4 w-16 rounded-full bg-muted" />
      </div>
      <div className="h-5 w-3/4 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-9 w-full rounded-lg bg-muted" />
    </div>
  );
}

function PulsePage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [pulses, setPulses] = useState<PulseRow[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PulseFilter>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await pulsesAPI.getPulses();
      setPulses((data?.pulses ?? data ?? []).map(normalize));
      if (user) {
        const mine = await pulsesAPI.getUserResponses();
        const map: Record<string, string> = {};
        (mine?.responses ?? mine ?? []).forEach((r: any) => {
          map[`${r.pulse_id ?? r.surveyId}:${r.question_id ?? "q1"}`] = r.option_id;
        });
        setResponses(map);
      }
    } catch {
      toast.error(t("admin_err"));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user?.id]);

  const completedCount = (p: PulseRow) =>
    p.questions.filter((q) => responses[`${p.id}:${q.id}`]).length;

  const isDone = (p: PulseRow) => completedCount(p) >= p.questions.length;

  const visible = pulses.filter((p) => {
    if (filter === "todo") return !isDone(p);
    if (filter === "done") return isDone(p);
    return true;
  });

  const doneCount = pulses.filter(isDone).length;

  const FILTERS: { key: PulseFilter; label: string }[] = [
    { key: "all", label: t("pulse_filter_all") },
    { key: "todo", label: t("pulse_filter_todo") },
    { key: "done", label: t("pulse_filter_done") },
  ];

  if (activeId) {
    const pulse = pulses.find((p) => p.id === activeId);
    if (!pulse) {
      setActiveId(null);
      return null;
    }
    return (
      <SurveyRunner
        pulse={pulse}
        existing={responses}
        onClose={() => { setActiveId(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          {t("pulse_title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("pulse_subtitle")}</p>
      </div>

      {/* Filter bar */}
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
            {visible.length} pulse{visible.length !== 1 ? "s" : ""}
            {doneCount > 0 && ` · ${doneCount} ${t("pulse_filter_done").toLowerCase()}`}
          </span>
        )}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <PulseSkeleton key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Radio className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {filter !== "all" ? t("pulse_empty_filtered") : t("pulse_no_surveys")}
          </p>
          {filter !== "all" && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setFilter("all")}>
              {t("pulse_filter_all")}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {visible.map((p) => {
            const done = isDone(p);
            const completed = completedCount(p);
            const total = p.questions.length;
            return (
              <Card key={p.id} className="p-6 border-border/50 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {getTranslation({ fr: p.topic_fr, en: p.topic_en }, lang)}
                  </Badge>
                  <Badge className={`gap-1 shrink-0 ${done ? "bg-success/15 text-success border-success/25" : "bg-accent/15 text-accent border-accent/25"}`}>
                    {done ? (
                      <><CheckCircle2 className="h-3 w-3" /> {t("pulse_already_done")}</>
                    ) : (
                      <><Award className="h-3 w-3" /> +{p.reward_points} XP</>
                    )}
                  </Badge>
                </div>
                <h3 className="font-semibold text-base leading-snug">
                  {getTranslation({ fr: p.topic_fr, en: p.topic_en }, lang)}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getTranslation({ fr: p.question_fr, en: p.question_en }, lang)}
                </p>
                <div className="text-xs text-muted-foreground">
                  {total} {t("pulse_questions")}
                  {completed > 0 && !done && ` · ${completed}/${total}`}
                </div>
                {completed > 0 && (
                  <Progress value={(completed / total) * 100} className="h-1.5" />
                )}
                <Button
                  onClick={() => setActiveId(p.id)}
                  disabled={done}
                  className="mt-auto"
                  variant={done ? "outline" : "default"}
                >
                  {done ? (
                    <><CheckCircle2 className="h-4 w-4 mr-1.5" /> {t("pulse_already_done")}</>
                  ) : completed > 0 ? (
                    <>{t("pulse_continue")} <ArrowRight className="h-4 w-4 ml-1.5" /></>
                  ) : (
                    <>{t("pulse_start")} <ArrowRight className="h-4 w-4 ml-1.5" /></>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SurveyRunner({
  pulse,
  existing,
  onClose,
}: {
  pulse: PulseRow;
  existing: Record<string, string>;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const questions = pulse.questions;
  const firstUnanswered = useMemo(() => {
    const i = questions.findIndex((q) => !existing[`${pulse.id}:${q.id}`]);
    return i === -1 ? 0 : i;
  }, [pulse.id, questions, existing]);
  const [step, setStep] = useState(firstUnanswered);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    questions.forEach((q) => {
      const v = existing[`${pulse.id}:${q.id}`];
      if (v) o[q.id] = v;
    });
    return o;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const q = questions[step];
  const total = questions.length;
  const progress = ((step + (answers[q.id] ? 1 : 0)) / total) * 100;

  const select = (optId: string) => setAnswers((a) => ({ ...a, [q.id]: optId }));

  const next = async () => {
    if (!answers[q.id]) return;
    if (step < total - 1) { setStep(step + 1); return; }
    if (!user) return;
    setSubmitting(true);
    const rows = questions
      .filter((qq) => answers[qq.id] && !existing[`${pulse.id}:${qq.id}`])
      .map((qq) => ({
        user_id: user.id,
        pulse_id: pulse.id,
        question_id: qq.id,
        option_id: answers[qq.id],
      }));
    if (rows.length) {
      try {
        await pulsesAPI.submitBatchResponses(pulse.id, rows);
        await awardXp(user.id, pulse.reward_points, "pulse_complete", { pulse_id: pulse.id });
        await awardBadgeIfMissing(user.id, "pulse_voice");
      } catch (error: any) {
        setSubmitting(false);
        return toast.error(error.message || t("admin_err"));
      }
    }
    setSubmitting(false);
    setDone(true);
    toast.success(`${t("pulse_completed")} · +${pulse.reward_points} XP`);
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-10 text-center space-y-4 border-border/50 bg-gradient-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{t("pulse_completed")}</h2>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-sm font-bold text-accent-foreground">
            <Sparkles className="h-4 w-4" />
            +{pulse.reward_points} XP
          </div>
          <div className="p-3 rounded-xl bg-gradient-card border border-border/40 text-sm flex gap-2 items-start text-left">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{t("pulse_thanks_feedback")}</span>
          </div>
          <Button onClick={onClose} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("pulse_back_surveys")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
        <ArrowLeft className="h-4 w-4" /> {t("pulse_back")}
      </button>
      <Card className="p-6 border-border/50 space-y-5">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {getTranslation({ fr: pulse.topic_fr, en: pulse.topic_en }, lang)}
          </Badge>
          <Badge className="bg-accent/15 text-accent border-accent/25 gap-1">
            <Award className="h-3 w-3" /> +{pulse.reward_points} XP
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("pulse_question")} {step + 1} {t("pulse_of")} {total}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <h3 className="text-lg font-semibold leading-snug">
          {getTranslation({ fr: q.prompt_fr, en: q.prompt_en }, lang)}
        </h3>
        <div className="space-y-2.5">
          {q.options.map((o) => {
            const selected = answers[q.id] === o.id;
            return (
              <button
                key={o.id}
                onClick={() => select(o.id)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all ${
                  selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                {getTranslation(o.label, lang)}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("pulse_previous")}
          </Button>
          <Button onClick={next} disabled={!answers[q.id] || submitting}>
            {step === total - 1 ? t("pulse_finish") : t("pulse_continue")}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
