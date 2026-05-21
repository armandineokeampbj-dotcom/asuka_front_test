import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { ArrowLeft, Check, PartyPopper } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/voice/$surveyId")({ component: SurveyRunner });

type Survey = {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  reward_amount: number;
  estimated_minutes: number;
  questions?: any[];
};

function SurveyRunner() {
  const { surveyId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      // TODO: Implement surveys table in Supabase
      // const { data } = await supabase
      //   .from("surveys")
      //   .select("*")
      //   .eq("id", surveyId)
      //   .single();
      // setSurvey(data as Survey);
      
      // Mock survey for testing
      setSurvey(null);
      toast.error("Surveys not implemented yet");
    } catch (error) {
      console.error("Error loading survey:", error);
      toast.error(t("survey_not_found"));
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t("loading")}</div>;
  }

  if (!survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <p className="text-lg font-semibold">{t("survey_not_found")}</p>
          <Button asChild className="mt-4">
            <Link to="/voice">{t("back_to_surveys")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const total = survey.questions?.length || 0;
  const questions = survey.questions || [];
  const q = total > 0 ? questions[step] : null;
  const progress = total > 0 ? ((step + (done ? 1 : 0)) / total) * 100 : 100;

  const choose = async (optionId: string) => {
    if (!user) return;
    
    const updated = { ...answers, [q.id]: optionId };
    setAnswers(updated);

    setTimeout(async () => {
      if (step < total - 1) {
        setStep(step + 1);
      } else {
        // Submit response
        try {
          // TODO: Implement survey_responses table
          // await supabase.from("survey_responses").insert([
          //   {
          //     user_id: user.id,
          //     survey_id: survey.id,
          //     answers: updated,
          //   },
          // ]);

          // // Add transaction for reward
          // await supabase.from("transactions").insert([
          //   {
          //     user_id: user.id,
          //     type: "survey_reward",
          //     amount: survey.reward_amount,
          //     description: survey.title_en,
          //   },
          // ]);

          setDone(true);
          toast.success(t("thank_you"));
        } catch (error: any) {
          toast.error(error.message || "Error submitting survey");
        }
      }
    }, 200);
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-md p-10 text-center border-border/50 bg-gradient-card animate-scale-in">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/15">
            <PartyPopper className="h-12 w-12 text-success" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-success">
            {t("thank_you")}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{t("you_earned")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("recorded")}
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild className="flex-1">
              <Link to="/voice">{t("more_surveys")}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/rewards">{t("view_wallet")}</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (total === 0 || !q) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <p className="text-lg font-semibold">{lang === "fr" ? "Ce sondage n'a pas de questions." : "This survey has no questions."}</p>
          <Button asChild className="mt-4">
            <Link to="/voice">{t("back_to_surveys")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-2xl px-6">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/voice" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </Button>

        <Card className="p-8 border-border/50 bg-gradient-card">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{lang === "fr" ? survey.title_fr : survey.title_en}</h1>
            <p className="text-muted-foreground">{lang === "fr" ? survey.description_fr : survey.description_en}</p>
          </div>

          <Progress value={progress} className="mb-4 h-2" />
          <p className="text-xs text-muted-foreground mb-6">
            {t("question_x_of_y")}
          </p>

          <h2 className="text-xl font-semibold mb-6">{q.question}</h2>

          <div className="space-y-3">
            {(q.options || []).map((opt: any) => (
              <button
                key={opt.id}
                onClick={() => choose(opt.id)}
                disabled={done}
                className="w-full p-4 rounded-xl border-2 border-border text-left font-medium transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                {typeof opt.label === "string" ? opt.label : opt.label[lang]}
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-muted text-sm">
            {lang === "fr" ? "Gagnez" : "Earn"}{" "}
            <span className="font-bold text-primary">{formatFCFA(survey.reward_amount)}</span>{" "}
            {lang === "fr" ? "pour compléter ce sondage." : "for completing this survey."}
          </div>
        </Card>
      </div>
    </div>
  );
}
