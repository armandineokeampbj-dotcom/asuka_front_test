import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { publicSurveysAPI, type SurveyResponseBody } from "@/lib/api-client";
import { awardXp, awardBadgeIfMissing } from "@/lib/asuka-actions";
import {
  ArrowLeft, Award, CheckCircle2, Lock, Loader2, ShieldAlert,
  EyeOff, RefreshCw, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/voice/$surveyId")({ component: SurveyRunner });

type Survey = {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr?: string;
  description_en?: string;
  questions: { id: string; text_fr: string; text_en: string; options: string[] }[];
  reward_xp?: number;
  is_public?: boolean;
  is_anonymous?: boolean;
  age_min?: number | null;
  age_max?: number | null;
  gender_restriction?: "male" | "female" | null;
  updatedAt?: string | null;
};

type UserResponse = {
  answers: Record<string, string>;
  createdAt: string;
  updatedAt?: string | null;
  survey_updated_at?: string | null;
};

type State =
  | "loading"
  | "access_denied"
  | "already_done"
  | "update_available"
  | "check_demographics"
  | "age_blocked"
  | "gender_blocked"
  | "running"
  | "respondent_form"
  | "done";

function computeAge(dob: string): number {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function SurveyRunner() {
  const { surveyId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [screen, setScreen] = useState<State>("loading");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [existingResponse, setExistingResponse] = useState<UserResponse | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [respondent, setRespondent] = useState({ name: "", firstname: "", email: "", phone: "" });

  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      const data = await publicSurveysAPI.getSurvey(surveyId);
      const raw = data?.survey ?? data;
      const s: Survey = { ...raw, id: raw._id ?? raw.id ?? surveyId };
      setSurvey(s);

      const userResp: UserResponse | null = data?.userResponse ?? null;
      setExistingResponse(userResp);

      if (userResp) {
        /* User already responded — check if survey was updated after their response */
        const surveyUpdatedAt = s.updatedAt ? new Date(s.updatedAt) : null;
        const responseSnapshot = userResp.survey_updated_at
          ? new Date(userResp.survey_updated_at)
          : null;
        const responseDate = new Date(userResp.updatedAt ?? userResp.createdAt);

        const surveyUpdatedSinceResponse =
          surveyUpdatedAt &&
          (!responseSnapshot
            ? surveyUpdatedAt > responseDate
            : surveyUpdatedAt > responseSnapshot);

        if (surveyUpdatedSinceResponse) {
          setScreen("update_available");
        } else {
          setScreen("already_done");
        }
        return;
      }

      if (needsDemographics(s)) {
        setScreen("check_demographics");
      } else {
        setScreen("running");
      }
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("AUTH_REQUIRED") || err?.status === 401) {
        setScreen("access_denied");
      } else {
        toast.error(t("voice_load_error"));
        setScreen("access_denied");
      }
    }
  };

  const needsDemographics = (s: Survey) =>
    s.age_min != null || s.age_max != null || !!s.gender_restriction;

  const enterUpdateMode = () => {
    /* Pre-fill answers from existing response */
    if (existingResponse?.answers) {
      setAnswers(existingResponse.answers);
    }
    setIsUpdateMode(true);
    if (survey && needsDemographics(survey)) {
      setScreen("check_demographics");
    } else {
      setScreen("running");
    }
  };

  const getTitle = (s: Survey) => (lang === "fr" ? s.title_fr : s.title_en) || s.title_fr || s.title_en;
  const getDesc = (s: Survey) =>
    (lang === "fr" ? s.description_fr : s.description_en) || s.description_fr || s.description_en;
  const getPrompt = (q: Survey["questions"][number]) =>
    (lang === "fr" ? q.text_fr : q.text_en) || q.text_fr || q.text_en;

  const handleDemographicsCheck = () => {
    if (!survey) return;
    if (survey.age_min != null || survey.age_max != null) {
      if (!dob) { toast.error(t("survey_dob_label")); return; }
      const age = computeAge(dob);
      if (survey.age_min != null && age < survey.age_min) { setScreen("age_blocked"); return; }
      if (survey.age_max != null && age > survey.age_max) { setScreen("age_blocked"); return; }
    }
    if (survey.gender_restriction) {
      if (!gender) { toast.error(t("survey_enter_gender")); return; }
      if (gender !== survey.gender_restriction) { setScreen("gender_blocked"); return; }
    }
    setScreen("running");
  };

  const select = (option: string) => {
    if (!survey) return;
    const q = survey.questions[step];
    setAnswers((prev) => ({ ...prev, [q.id]: option }));
  };

  const nextStep = () => {
    if (!survey) return;
    const q = survey.questions[step];
    if (!answers[q.id]) return;
    if (step < survey.questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (survey.is_anonymous === false) {
      setScreen("respondent_form");
    } else {
      submitFinal();
    }
  };

  const submitFinal = async (resp?: typeof respondent) => {
    if (!survey) return;
    setSubmitting(true);
    try {
      const body: SurveyResponseBody = { answers };
      if (dob) body.dob = dob;
      if (gender) body.gender = gender;
      if (resp) body.respondent = resp;

      if (isUpdateMode) {
        /* PATCH — no XP */
        await publicSurveysAPI.updateResponse(survey.id, body);
      } else {
        /* POST — award XP */
        await publicSurveysAPI.submitResponse(survey.id, body);
        if (user) {
          await awardXp(user.id, survey.reward_xp ?? 0, "voice_complete", { survey_id: survey.id });
          await awardBadgeIfMissing(user.id, "voice_complete");
        }
      }

      setScreen("done");
      const xpMsg = !isUpdateMode && (survey.reward_xp ?? 0) > 0 ? ` · +${survey.reward_xp} XP` : "";
      toast.success(`${t("voice_completed_msg")}${xpMsg}`);
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("ALREADY_RESPONDED")) {
        toast.error("Vous avez déjà répondu à ce sondage.");
      } else {
        toast.error(err.message || t("voice_load_error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondentSubmit = () => {
    if (!respondent.name || !respondent.firstname || !respondent.email || !respondent.phone) {
      toast.error("Tous les champs sont obligatoires.");
      return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(respondent.email)) {
      toast.error("Format e-mail invalide.");
      return;
    }
    submitFinal(respondent);
  };

  /* ── Screens ──────────────────────────────────────────────────────────────── */

  if (screen === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (screen === "access_denied") {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-10 text-center space-y-4 border-border/50 bg-gradient-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">{t("survey_private_message")}</p>
          <Button asChild>
            <Link to="/auth/sign-in">{t("survey_login_btn")}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/voice">{t("back_to_surveys")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (screen === "already_done") {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-10 text-center space-y-4 border-border/50 bg-gradient-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCheck className="h-8 w-8 text-success" />
          </div>
          <p className="text-lg font-semibold">{t("survey_already_done")}</p>
          <Button asChild variant="outline">
            <Link to="/voice">{t("back_to_surveys")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (screen === "update_available") {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-8 border-border/50 bg-gradient-card space-y-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-base">{t("survey_update_available")}</p>
              {survey && <p className="text-sm text-muted-foreground mt-0.5">{getTitle(survey)}</p>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("survey_update_subtitle")}
          </p>
          <div className="flex flex-col gap-2.5 pt-1">
            <Button onClick={enterUpdateMode} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("survey_update_btn")}
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/voice">{t("survey_keep_btn")}</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (screen === "age_blocked") {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-10 text-center space-y-4 border-border/50 bg-gradient-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-lg font-semibold">{t("survey_age_blocked")}</p>
          <Button asChild variant="outline">
            <Link to="/voice">{t("back_to_surveys")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (screen === "gender_blocked") {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-10 text-center space-y-4 border-border/50 bg-gradient-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-lg font-semibold">{t("survey_gender_blocked")}</p>
          <Button asChild variant="outline">
            <Link to="/voice">{t("back_to_surveys")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (screen === "check_demographics") {
    const needsAge = survey && (survey.age_min != null || survey.age_max != null);
    const needsGender = survey?.gender_restriction;
    return (
      <div className="max-w-md mx-auto mt-6 space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link to="/voice">
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_surveys")}
          </Link>
        </Button>
        <Card className="p-7 border-border/50 bg-gradient-card space-y-5">
          {survey && (
            <div>
              <h1 className="text-xl font-bold mb-1">{getTitle(survey)}</h1>
              {getDesc(survey) && <p className="text-sm text-muted-foreground">{getDesc(survey)}</p>}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {needsAge && needsGender
              ? `${t("survey_enter_dob")} ${t("survey_enter_gender").toLowerCase()}.`
              : needsAge
              ? t("survey_enter_dob")
              : t("survey_enter_gender")}
          </p>
          {needsAge && (
            <div className="space-y-1.5">
              <Label className="text-sm">{t("survey_dob_label")}</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </div>
          )}
          {needsGender && (
            <div className="space-y-1.5">
              <Label className="text-sm">{t("survey_enter_gender")}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("survey_gender_male")}</SelectItem>
                  <SelectItem value="female">{t("survey_gender_female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="w-full" onClick={handleDemographicsCheck}>
            {t("survey_check_btn")}
          </Button>
        </Card>
      </div>
    );
  }

  if (screen === "respondent_form") {
    return (
      <div className="max-w-md mx-auto mt-6 space-y-4">
        <Card className="p-7 border-border/50 bg-gradient-card space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
              {t("survey_respondent_title")}
            </p>
            <p className="text-sm text-muted-foreground">{t("survey_respondent_subtitle")}</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("survey_respondent_name")}</Label>
                <Input value={respondent.name} onChange={(e) => setRespondent({ ...respondent, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("survey_respondent_firstname")}</Label>
                <Input value={respondent.firstname} onChange={(e) => setRespondent({ ...respondent, firstname: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("survey_respondent_email")}</Label>
              <Input type="email" value={respondent.email} onChange={(e) => setRespondent({ ...respondent, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("survey_respondent_phone")}</Label>
              <Input type="tel" value={respondent.phone} onChange={(e) => setRespondent({ ...respondent, phone: e.target.value })} />
            </div>
          </div>
          <Button className="w-full" onClick={handleRespondentSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("pulse_finish")}
          </Button>
        </Card>
      </div>
    );
  }

  if (screen === "done") {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-10 text-center space-y-4 border-border/50 bg-gradient-card">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-success">{t("thank_you")}</p>
          <h2 className="text-2xl font-bold">{t("voice_completed_msg")}</h2>
          {!isUpdateMode && user && survey && (survey.reward_xp ?? 0) > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-sm font-bold text-accent-foreground">
              <Award className="h-4 w-4" />
              +{survey.reward_xp} XP {t("voice_earned_xp")}
            </div>
          )}
          <p className="text-sm text-muted-foreground">{t("recorded")}</p>
          <div className="flex gap-3 mt-2">
            <Button asChild className="flex-1">
              <Link to="/voice">{t("more_surveys")}</Link>
            </Button>
            {user && !isUpdateMode && (
              <Button asChild variant="outline" className="flex-1">
                <Link to="/rewards">{t("view_wallet")}</Link>
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  /* screen === "running" */
  if (!survey || survey.questions.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
        <div>
          <p className="text-muted-foreground">{t("voice_no_questions")}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/voice">{t("back_to_surveys")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const total = survey.questions.length;
  const q = survey.questions[step];
  const selectedOption = answers[q?.id ?? ""];
  const progress = ((step + (selectedOption ? 1 : 0)) / total) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-1.5">
        <Link to="/voice">
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_surveys")}
        </Link>
      </Button>

      {/* Update mode banner */}
      {isUpdateMode && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">
          <RefreshCw className="h-4 w-4 shrink-0" />
          {t("survey_update_btn")} — {t("survey_update_subtitle").split("—")[1]?.trim() ?? "Aucun XP supplémentaire"}
        </div>
      )}

      {/* Anonymous notice */}
      {!isUpdateMode && survey.is_anonymous === true && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
          <EyeOff className="h-4 w-4 shrink-0" />
          {t("survey_anon_notice")}
        </div>
      )}

      <Card className="p-6 sm:p-8 border-border/50 bg-gradient-card space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-1">{getTitle(survey)}</h1>
          {getDesc(survey) && <p className="text-sm text-muted-foreground">{getDesc(survey)}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("pulse_question")} {step + 1} {t("pulse_of")} {total}</span>
            {!isUpdateMode && (survey.reward_xp ?? 0) > 0 && (
              <Badge className="bg-accent/15 text-accent border-accent/25 gap-1 text-[10px]">
                <Award className="h-2.5 w-2.5" />
                +{survey.reward_xp} XP
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <h2 className="text-lg font-semibold leading-snug">{getPrompt(q)}</h2>

        <div className="space-y-2.5">
          {(q.options ?? []).map((opt, idx) => (
            <button
              key={idx}
              onClick={() => select(opt)}
              className={`w-full text-left rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all ${
                selectedOption === opt
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("pulse_previous")}
          </Button>
          <Button onClick={nextStep} disabled={!selectedOption || submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === total - 1 ? (
              t("pulse_finish")
            ) : (
              t("pulse_continue")
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
