import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { Coins, ChevronRight, CheckCircle2, Sparkles, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/voice")({ component: VoicePage });

type Survey = {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  reward_amount: number;
  estimated_minutes: number;
  is_published: boolean;
  questions?: any[];
};

function VoicePage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      // TODO: Implement surveys table in Supabase
      // const { data: surveysData } = await supabase
      //   .from("surveys")
      //   .select("*")
      //   .eq("is_published", true)
      //   .order("created_at", { ascending: false });
      // setSurveys((surveysData ?? []) as Survey[]);

      // TODO: Implement survey_responses table
      // const { data: responsesData } = await supabase
      //   .from("survey_responses")
      //   .select("survey_id")
      //   .eq("user_id", user?.id);
      // const completedIds = new Set((responsesData ?? []).map((r: any) => r.survey_id));
      // setCompleted(completedIds);

      // TODO: Implement transactions table
      // const { data: transactionsData } = await supabase
      //   .from("transactions")
      //   .select("amount")
      //   .eq("user_id", user?.id)
      //   .eq("type", "survey_reward");
      // const totalBalance = (transactionsData ?? []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      // setBalance(totalBalance);

      setSurveys([]);
      setCompleted(new Set());
      setBalance(0);
    } catch (error) {
      console.error("Error loading voice data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFCFA = (amount: number) => {
    return `${amount.toLocaleString("fr-FR")} FCFA`;
  };

  const available = surveys.length - completed.size;
  const potentialEarnings = surveys
    .filter((s) => !completed.has(s.id))
    .reduce((sum, s) => sum + s.reward_amount, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-8 border-border/50 bg-gradient-card">
        <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
        <div className="relative">
          <h1 className="text-3xl font-bold">{t("voice_title")}</h1>
          <p className="text-muted-foreground mt-2">{t("voice_sub")}</p>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("available")}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {available}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                {t("surveys_word")}
              </span>
            </p>
          </div>
          <div className="border-l border-border pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("balance")}
            </p>
            <p className="mt-1 text-2xl font-bold text-gradient-primary">
              {formatFCFA(balance)}
            </p>
          </div>
        </div>

        {potentialEarnings > 0 && (
          <div className="relative mt-4 flex items-center gap-2 rounded-2xl bg-accent/10 px-3.5 py-2.5 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            {t("earn_up_to")}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("surveys_for_you")}</h3>
          <span className="text-xs text-muted-foreground">{t("total_count")}</span>
        </div>
        {surveys.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground border-dashed">
            {lang === "fr" ? "Aucun sondage disponible pour le moment." : "No surveys available yet."}
          </Card>
        ) : (
          surveys.map((s) => {
            const done = completed.has(s.id);
            return (
              <Link
                key={s.id}
                to="/_app/voice/$surveyId"
                params={{ surveyId: s.id }}
                disabled={done}
                className={`group block rounded-3xl bg-card p-5 shadow-card transition-all ${
                  done ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-elevated cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        <Clock className="h-2.5 w-2.5" />
                        {s.estimated_minutes || 2} {t("min_short")}
                      </span>
                      {done && (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                          {t("done_label")}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold leading-snug">
                      {lang === "fr" ? s.title_fr : s.title_en}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lang === "fr" ? s.description_fr : s.description_en}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-foreground">
                        <Coins className="h-3.5 w-3.5" />
                        +{formatFCFA(s.reward_amount)}
                      </span>
                    </div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
