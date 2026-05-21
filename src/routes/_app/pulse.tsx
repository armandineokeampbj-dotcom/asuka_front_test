import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/i18n/LanguageProvider";
import { Radio, TrendingUp, Sparkles, CheckCircle2, ArrowLeft, ArrowRight, Award } from "lucide-react";
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

function normalize(p: any): PulseRow {
  const questions: PulseQuestion[] = Array.isArray(p.questions) && p.questions.length
    ? p.questions
    : [{ id: "q1", prompt_fr: p.question_fr, prompt_en: p.question_en, options: p.options ?? [] }];
  return { ...p, options: p.options ?? [], questions, reward_points: p.reward_points ?? 15 };
}

function PulsePage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [pulses, setPulses] = useState<PulseRow[]>([]);
  // responses keyed by `${pulse_id}:${question_id}` -> option_id
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = async () => {
    const data = await pulsesAPI.getPulses();
    setPulses((data ?? []).map(normalize));
    if (user) {
      const mine = await pulsesAPI.getUserResponses();
      const map: Record<string, string> = {};
      (mine ?? []).forEach((r: any) => {
        map[`${r.pulse_id}:${r.question_id ?? "q1"}`] = r.option_id;
      });
      setResponses(map);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const completedCount = (p: PulseRow) =>
    p.questions.filter((q) => responses[`${p.id}:${q.id}`]).length;

  const isDone = (p: PulseRow) => completedCount(p) >= p.questions.length;

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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" /> {t("pulse_title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("pulse_subtitle")}</p>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("pulse_available")}
      </h2>

      <div className="grid md:grid-cols-2 gap-5">
        {pulses.map((p) => {
          const done = isDone(p);
          const completed = completedCount(p);
          const total = p.questions.length;
          return (
            <Card key={p.id} className="p-6 border-border/50 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <Badge variant="outline" className="text-[10px]">
                  {lang === "fr" ? p.topic_fr : p.topic_en}
                </Badge>
                <Badge className="bg-accent/15 text-accent border-accent/30 gap-1">
                  <Award className="h-3 w-3" /> +{p.reward_points} {t("pulse_points")}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg leading-snug">
                {lang === "fr" ? p.topic_fr : p.topic_en}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {lang === "fr" ? p.question_fr : p.question_en}
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
                  <><CheckCircle2 className="h-4 w-4 mr-1" /> {t("pulse_already_done")}</>
                ) : completed > 0 ? (
                  <>{t("pulse_continue")} <ArrowRight className="h-4 w-4 ml-1" /></>
                ) : (
                  <>{t("pulse_start")} <ArrowRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </Card>
          );
        })}
        {!pulses.length && (
          <Card className="p-10 text-center text-muted-foreground border-dashed col-span-full">
            {t("pulse_no_surveys")}
          </Card>
        )}
      </div>
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
        return toast.error(error.message || "Error submitting responses");
      }
    }
    setSubmitting(false);
    setDone(true);
    toast.success(`${t("pulse_completed")} · +${pulse.reward_points} XP`);
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-10 text-center space-y-4 border-border/50">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{t("pulse_completed")}</h2>
          <p className="text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-4 w-4 text-accent" />
            +{pulse.reward_points} {t("pulse_points")}
          </p>
          <div className="p-3 rounded-xl bg-gradient-card border border-border/40 text-sm flex gap-2 items-start text-left">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{lang === "fr"
              ? "Merci ! Tes réponses nourrissent l'intelligence Pulse pour la jeunesse africaine."
              : "Thanks! Your answers feed Pulse intelligence for African youth."}</span>
          </div>
          <Button onClick={onClose} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-1" /> {lang === "fr" ? "Retour aux sondages" : "Back to surveys"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> {lang === "fr" ? "Retour" : "Back"}
      </button>
      <Card className="p-6 border-border/50 space-y-5">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {lang === "fr" ? pulse.topic_fr : pulse.topic_en}
          </Badge>
          <Badge className="bg-accent/15 text-accent border-accent/30 gap-1">
            <Award className="h-3 w-3" /> +{pulse.reward_points}
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
          {lang === "fr" ? q.prompt_fr : q.prompt_en}
        </h3>
        <div className="space-y-2">
          {q.options.map((o) => {
            const selected = answers[q.id] === o.id;
            return (
              <button
                key={o.id}
                onClick={() => select(o.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                }`}
              >
                {o.label[lang]}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {lang === "fr" ? "Précédent" : "Previous"}
          </Button>
          <Button onClick={next} disabled={!answers[q.id] || submitting}>
            {step === total - 1 ? t("pulse_finish") : t("pulse_continue")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
