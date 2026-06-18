import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { profileAPI } from "@/lib/api-client";
import { toast } from "sonner";
import { Logo } from "@/components/asuka/Logo";
import { LanguageSwitcher } from "@/components/asuka/LanguageSwitcher";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
        active ? "bg-gradient-hero text-primary-foreground border-transparent shadow-soft" : "bg-card border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function Onboarding() {
  const { user, loading, setAuthData, token } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const total = 6;

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    // Generate identity labels + scores from inputs
    const labels: string[] = [];
    if (goals.includes("business")) labels.push(lang === "fr" ? "Esprit Entrepreneurial" : "Entrepreneurial Mindset");
    if (goals.includes("impact")) labels.push(lang === "fr" ? "Bâtisseur·euse de Communauté" : "Community Builder");
    if (skills.length >= 3) labels.push(lang === "fr" ? "Penseur Créatif" : "Creative Thinker");
    if (interests.includes("tech") || interests.includes("ai")) labels.push(lang === "fr" ? "Explorateur Digital" : "Digital Explorer");
    if (!labels.length) labels.push(lang === "fr" ? "Leader Émergent" : "Emerging Leader");

    const base = 50 + Math.min(30, skills.length * 5 + goals.length * 3);
    const scores = {
      employability: Math.min(95, base + 8),
      leadership: Math.min(95, base - 5 + (goals.includes("impact") ? 10 : 0)),
      digital: Math.min(95, base + (interests.includes("tech") || interests.includes("ai") ? 15 : -5)),
      communication: Math.min(95, base - 2),
      entrepreneurship: Math.min(95, base + (goals.includes("business") ? 18 : -8)),
      community: Math.min(95, base + (goals.includes("impact") ? 12 : -5)),
    };

    try {
      await profileAPI.updateProfile(user.id, {
        full_name: name || user.firstName + " " + user.lastName || null,
        country: country || null,
        current_status: status || null,
        goals, skills, interests,
        identity_labels: labels,
        scores,
        language: lang,
        onboarded: true,
      });
      
      // Update auth context with onboarded status
      const updatedUser = {
        ...user,
        onboarded: true,
      };
      if (token) {
        setAuthData(token, updatedUser);
      }
      
      setBusy(false);
      toast.success(t("onb_success"));
      nav({ to: "/dashboard" });
    } catch (err: any) {
      setBusy(false);
      toast.error(err.message || t("onb_error"));
    }
  };

  const statusOpts = [
    { v: "student", l: t("status_student") },
    { v: "jobseeker", l: t("status_jobseeker") },
    { v: "employed", l: t("status_employed") },
    { v: "entrepreneur", l: t("status_entrepreneur") },
    { v: "freelance", l: t("status_freelance") },
  ];
  const goalOpts = [
    { v: "job", l: t("goal_job") }, { v: "skill", l: t("goal_skill") }, { v: "business", l: t("goal_business") },
    { v: "scholarship", l: t("goal_scholarship") }, { v: "mentor", l: t("goal_mentor") }, { v: "impact", l: t("goal_impact") },
  ];
  const skillOpts = ["Communication","Leadership","Design","Coding","Data","Marketing","Sales","Writing","Public speaking","Teamwork"];
  const interestOpts = [
    { v: "tech", l: "Tech" },
    { v: "ai", l: "IA / AI" },
    { v: "climate", l: t("onb_interest_climate") },
    { v: "health", l: t("onb_interest_health") },
    { v: "education", l: t("onb_interest_education") },
    { v: "arts", l: "Arts" },
    { v: "finance", l: "Finance" },
    { v: "agriculture", l: "Agriculture" },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-gradient-aurora pointer-events-none" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Logo /><LanguageSwitcher />
      </div>
      <Card className="relative w-full max-w-2xl p-8 glass border-border/50 shadow-glow">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{t("onb_step")} {step + 1} {t("onb_of")} {total}</span>
        </div>
        <Progress value={((step + 1) / total) * 100} className="h-1.5 mb-8" />

        {step === 0 && (
          <div>
            <h2 className="text-3xl font-bold">{t("onb_welcome")}</h2>
            <p className="text-muted-foreground mt-2">{t("onb_welcome_sub")}</p>
            <div className="mt-6">
              <label className="text-sm font-medium">{t("onb_q_name")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aïssatou" className="mt-2" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold">{t("onb_q_country")}</h2>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={lang==="fr"?"Sénégal, Dakar":"Senegal, Dakar"} className="mt-4" />
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold">{t("onb_q_status")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {statusOpts.map((o) => <Chip key={o.v} active={status === o.v} onClick={() => setStatus(o.v)}>{o.l}</Chip>)}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold">{t("onb_q_goals")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {goalOpts.map((o) => <Chip key={o.v} active={goals.includes(o.v)} onClick={() => toggle(goals, o.v, setGoals)}>{o.l}</Chip>)}
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold">{t("onb_q_skills")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {skillOpts.map((s) => <Chip key={s} active={skills.includes(s)} onClick={() => toggle(skills, s, setSkills)}>{s}</Chip>)}
            </div>
          </div>
        )}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold">{t("onb_q_interests")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {interestOpts.map((o) => <Chip key={o.v} active={interests.includes(o.v)} onClick={() => toggle(interests, o.v, setInterests)}>{o.l}</Chip>)}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>{t("onb_back")}</Button>
          {step < total - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="bg-gradient-hero shadow-glow border-0">{t("onb_next")}</Button>
          ) : (
            <Button onClick={finish} disabled={busy} className="bg-gradient-hero shadow-glow border-0">{t("onb_finish")}</Button>
          )}
        </div>
      </Card>
    </div>
  );
}