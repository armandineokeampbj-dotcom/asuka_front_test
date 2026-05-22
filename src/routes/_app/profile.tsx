import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { callProfileAI, callProfileImport } from "@/lib/api";
import { profileAPI, storageAPI } from "@/lib/api-client";
import { toast } from "sonner";
import { computeCompletion } from "@/lib/profile-completion";
import { getDisplayScores, calculateReadiness } from "@/lib/score-calculator";
import { getDegreeListByLang } from "@/lib/education-data";
import { awardXp, awardBadgeIfMissing, notify } from "@/lib/asuka-actions";
import {
  Sparkles, Trophy, Flame, Edit3, Plus, Trash2, GraduationCap, Briefcase,
  Award, Target, Globe, Camera, Download, Brain, ShieldCheck, Eye, Loader2,
  Linkedin, Github, Link2, FileText, MapPin, User, Phone, Calendar, Building2,
  Languages, CheckCircle2, Layers, Lock, Users, Wand2, Upload, Type, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

const COUNTRY_DIAL_CODES: Record<string, string> = {
  BJ: "+229", BF: "+226", CV: "+238", CI: "+225", GM: "+220",
  GH: "+233", GN: "+224", GW: "+245", LR: "+231", ML: "+223",
  MR: "+222", NE: "+227", SN: "+221", SL: "+232", TG: "+228",
};

type Profile = any;
type Edu = { id?: string; degree?: string; field?: string; institution: string; country?: string; startDate?: string; endDate?: string; currentlyStudying?: boolean; description?: string; achievements?: string };
type Cert = { id?: string; name: string; issuer?: string; issueDate?: string; credentialUrl?: string; issue_date?: string; credential_url?: string };
type Exp = { id?: string; role: string; organization?: string; industry?: string; type?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string; teamSize?: number; impact?: string; sector?: string; kind?: string; start_date?: string; end_date?: string; is_current?: boolean; team_size?: number };
type Skill = { id?: string; skill_id?: string; _id?: string; name: string; category: string; level: number; validations?: any };
type Port = { id?: string; type?: string; title: string; description?: string; url?: string; imageUrl?: string; kind?: string };

function scoreQuality(v: number, lang: string) {
  if (v >= 70) return lang === "fr" ? "Solide" : "Strong";
  if (v >= 40) return lang === "fr" ? "En progression" : "Growing";
  return lang === "fr" ? "À développer" : "Developing";
}

function Ring({ value, label, quality }: { value: number; label: string; quality?: string }) {
  const r = 28, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  const qualColor = value >= 70 ? "text-success bg-success/10" : value >= 40 ? "text-accent bg-accent/10" : "text-muted-foreground bg-muted";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width="72" height="72">
          <circle cx="36" cy="36" r={r} stroke="oklch(0.92 0.012 280)" strokeWidth="6" fill="none" />
          <circle cx="36" cy="36" r={r} stroke="url(#gp)" strokeWidth="6" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 36 36)" />
          <defs><linearGradient id="gp" x1="0" x2="1"><stop offset="0%" stopColor="oklch(0.42 0.18 275)" /><stop offset="100%" stopColor="oklch(0.78 0.18 65)" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{value}</div>
      </div>
      <div className="text-[11px] text-muted-foreground text-center max-w-[90px]">{label}</div>
      {quality && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${qualColor}`}>{quality}</span>}
    </div>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short" }); } catch { return d; }
}

function skillLevelColor(level: number) {
  return level >= 4 ? "bg-success/15 text-success border-success/30" : level === 3 ? "bg-primary/10 text-primary border-primary/20" : level === 2 ? "bg-accent/10 text-foreground border-accent/20" : "bg-muted text-muted-foreground border-border";
}

function ProfilePage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [p, setP] = useState<Profile>(null);
  const [education, setEducation] = useState<Edu[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [exps, setExps] = useState<Exp[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [portfolio, setPortfolio] = useState<Port[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [xpEvents, setXpEvents] = useState<any[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);

  // Profile import state
  const [importMode, setImportMode] = useState<'file' | 'text'>('file');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);

  const [showPersonalForm, setShowPersonalForm] = useState(false);
  const [showAspirationsForm, setShowAspirationsForm] = useState(false);
  const [showSocialForm, setShowSocialForm] = useState(false);
  const [timelinePage, setTimelinePage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [insightsHighlighted, setInsightsHighlighted] = useState(false);
  const insightsCardRef = useRef<HTMLDivElement>(null);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const reload = async () => {
    if (!user?.id) return;
    try {
      const data = await profileAPI.getProfile(user.id);
      const norm = (arr: any[]) => arr.map((item: any) => ({ ...item, id: item.id ?? String(item._id) }));
      setP(data.profile);
      setEducation(norm(data.education ?? []));
      setCerts(norm(data.certifications ?? []));
      setExps(norm(data.experiences ?? []));
      setSkills(norm(data.skills ?? []));
      setPortfolio(norm(data.portfolio ?? []));
      setBadges(data.badges ?? []);
      setXpEvents(data.xpEvents ?? []);
    } catch (err) {
      console.error("Profile load error:", err);
      toast.error("Erreur lors du chargement du profil");
    }
  };

  useEffect(() => { reload(); }, [user?.id]);

  const completion = useMemo(
    () => computeCompletion({ profile: p, educationCount: education.length, experienceCount: exps.length, skillsCount: skills.length, certificationsCount: certs.length, portfolioCount: portfolio.length }),
    [p, education, exps, skills, certs, portfolio],
  );

  // Calculate dynamic scores based on profile completion and content
  const scores = useMemo(() => {
    const dynamicScores = getDisplayScores(completion.score, {
      completion: completion.score,
      experienceCount: exps.length,
      skillsCount: skills.length,
      educationCount: education.length,
      portfolioCount: portfolio.length,
      hasResume: !!p?.cvUrl,
      verifications: p?.verifications || {},
    }, p?.scores);

    return dynamicScores;
  }, [completion.score, exps.length, skills.length, education.length, portfolio.length, p?.cvUrl, p?.scores]);

  // Calculate readiness for different opportunity types
  const readiness = useMemo(() => {
    return calculateReadiness({
      completion: completion.score,
      experienceCount: exps.length,
      skillsCount: skills.length,
      educationCount: education.length,
      portfolioCount: portfolio.length,
      hasResume: !!p?.cvUrl,
      verifications: p?.verifications || {},
    });
  }, [completion.score, exps.length, skills.length, education.length, portfolio.length, p?.cvUrl]);

  const labels: string[] = p?.identity_labels || [];

  const profileSummary = useMemo(() => {
    if (!p) return "";
    const name = p.preferred_name || p.full_name || user?.firstName || (lang === "fr" ? "Vous" : "You");
    const location = [p.city, p.country].filter(Boolean).join(", ");
    const expCount = exps.length;
    const skillCount = skills.length;
    const score = completion.score;
    if (lang === "fr") {
      let s = name;
      if (location) s += ` est basé(e) à ${location}`;
      if (expCount > 0 && skillCount > 0) s += `, avec ${expCount} expérience${expCount > 1 ? "s" : ""} et ${skillCount} compétence${skillCount > 1 ? "s" : ""} enregistrée${skillCount > 1 ? "s" : ""}`;
      else if (expCount > 0) s += `, avec ${expCount} expérience${expCount > 1 ? "s" : ""}`;
      else if (skillCount > 0) s += `, avec ${skillCount} compétence${skillCount > 1 ? "s" : ""} enregistrée${skillCount > 1 ? "s" : ""}`;
      s += `. Son profil est complété à ${score}%.`;
      return s;
    } else {
      let s = name;
      if (location) s += ` is based in ${location}`;
      if (expCount > 0 && skillCount > 0) s += `, with ${expCount} experience${expCount > 1 ? "s" : ""} and ${skillCount} skill${skillCount > 1 ? "s" : ""}`;
      else if (expCount > 0) s += `, with ${expCount} experience${expCount > 1 ? "s" : ""}`;
      else if (skillCount > 0) s += `, with ${skillCount} skill${skillCount > 1 ? "s" : ""}`;
      s += `. Profile is ${score}% complete.`;
      return s;
    }
  }, [p, exps.length, skills.length, completion.score, lang, user?.firstName]);

  const nextSteps = useMemo(() => {
    if (!p) return [] as { label: string; tab: string }[];
    const fr = lang === "fr";
    const steps: { label: string; tab: string }[] = [];
    if (!p.bio?.trim()) steps.push({ label: fr ? "Ajouter une bio" : "Add a bio", tab: "personal" });
    if (!p.dream_career) steps.push({ label: fr ? "Définir ton objectif" : "Set career goal", tab: "aspirations" });
    if (education.length === 0) steps.push({ label: fr ? "Ajouter une formation" : "Add education", tab: "education" });
    if (exps.length === 0) steps.push({ label: fr ? "Ajouter une expérience" : "Add experience", tab: "experience" });
    if (skills.length === 0) steps.push({ label: fr ? "Ajouter des compétences" : "Add skills", tab: "skills" });
    return steps;
  }, [p, education.length, exps.length, skills.length, lang]);

  // Extract XP data
  const level = useMemo(() => Math.floor((p?.xp ?? 0) / 500) + 1, [p?.xp]);
  const xp = useMemo(() => (p?.xp ?? 0) % 500, [p?.xp]);
  const xpPct = useMemo(() => (xp / 500) * 100, [xp]);
  const xpInLevel = useMemo(() => Math.floor(xp), [xp]);
  const streak = useMemo(() => p?.streak ?? 0, [p?.streak]);
  const insights = useMemo(() => p?.ai_insights ?? {}, [p?.ai_insights]);

  // Rate limit states
  const aiInsightsNextDate = useMemo(() => {
    if (!p?.lastAiInsightsAt) return null;
    const ms = new Date(p.lastAiInsightsAt).getTime() + 7 * 24 * 60 * 60 * 1000;
    return ms > Date.now() ? new Date(ms) : null;
  }, [p?.lastAiInsightsAt]);

  const importNextDate = useMemo(() => {
    if (!p?.lastProfileImportAt) return null;
    const ms = new Date(p.lastProfileImportAt).getTime() + 30 * 24 * 60 * 60 * 1000;
    return ms > Date.now() ? new Date(ms) : null;
  }, [p?.lastProfileImportAt]);

  const saveProfile = async (patch: Record<string, any>) => {
    if (!user) return;
    try {
      await profileAPI.updateProfile(user.id, patch);
      toast.success(t("prof_saved"));
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    }
  };

  useEffect(() => {
    setTimelinePage(1);
  }, [xpEvents]);

  const runAi = async () => {
    if (!user || !p) return;
    setAiBusy(true);
    try {
      const profilePayload = {
        full_name: p.full_name, country: p.country, city: p.city, bio: p.bio,
        languages_spoken: p.languages_spoken, primary_language: p.primary_language,
        skills: skills.map((s) => ({ name: s.name, category: s.category, level: s.level })),
        education, experiences: exps, certifications: certs, portfolio,
        dream_career: p.dream_career, industries: p.industries, causes: p.causes,
      };
      const data = await callProfileAI({ action: "analyze_profile", lang, profile: profilePayload });
      const update: any = { personality_insights: data };
      if ((data as any).identity_labels) update.identity_labels = (data as any).identity_labels;
      if ((data as any).readiness) update.readiness = (data as any).readiness;
      await profileAPI.updateProfile(user.id, update);
      await awardXp(user.id, 30, "ai_profile_insights");
      await awardBadgeIfMissing(user.id, "ai_optimized_profile");
      await notify(user.id, lang === "fr" ? "Insights IA générés" : "AI insights generated", undefined, "profile");
      toast.success(lang === "fr" ? "Insights IA prêts ✨" : "AI insights ready ✨", {
        action: {
          label: lang === "fr" ? "Voir le dashboard" : "Open dashboard",
          onClick: () => navigate({ to: "/dashboard" }),
        },
      });
      setActiveTab("overview");
      setInsightsHighlighted(true);
      setTimeout(() => insightsCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 500);
      setTimeout(() => setInsightsHighlighted(false), 5000);
      reload();
    } catch (e: any) {
      if (e.status === 429 && e.data?.nextAvailableAt) {
        const dateStr = new Date(e.data.nextAvailableAt).toLocaleDateString(
          lang === "fr" ? "fr-FR" : "en-US",
          { day: "numeric", month: "long", year: "numeric" }
        );
        toast.error(
          lang === "fr"
            ? `Tu pourras générer de nouveaux insights le ${dateStr}.`
            : `New insights available on ${dateStr}.`
        );
      } else {
        toast.error(e.message || "AI error");
      }
    } finally { setAiBusy(false); }
  };

  const generateCv = async () => {
    if (!user || !p) return;
    setCvBusy(true);
    try {
      const profilePayload = { ...p, education, experiences: exps, certifications: certs, skills, portfolio };
      const data: any = await callProfileAI({ action: "generate_cv", lang, profile: profilePayload });
      if (data?.url) {
        await awardXp(user.id, 20, "cv_generated");
        toast.success(lang === "fr" ? "CV généré avec succès !" : "CV generated successfully!");
        reload();
      } else {
        throw new Error(lang === "fr" ? "URL manquante dans la réponse" : "Missing URL in response");
      }
    } catch (e: any) {
      toast.error(e.message || (lang === "fr" ? "Erreur lors de la génération du CV" : "CV generation error"));
    } finally {
      setCvBusy(false);
    }
  };

  const downloadCv = async () => {
    if (!p?.cvUrl) return;
    try {
      const res = await fetch(p.cvUrl);
      if (!res.ok) throw new Error("Erreur réseau");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `CV-${(p.preferred_name || p.full_name || "profil").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error(lang === "fr" ? "Erreur lors du téléchargement" : "Download failed");
    }
  };

  const runProfileImport = async () => {
    if (!user?.id) return;
    setImportBusy(true);
    try {
      let payload: { text?: string; fileId?: string; lang: string };
      if (importMode === 'file' && importFile) {
        const uploaded = await storageAPI.uploadFile(importFile);
        payload = { fileId: uploaded.fileId, lang };
      } else if (importMode === 'text' && importText.trim()) {
        payload = { text: importText, lang };
      } else {
        return;
      }
      const data = await callProfileImport(payload);
      setImportSummary(data.summary);
      toast.success(lang === 'fr' ? 'Profil mis à jour automatiquement !' : 'Profile auto-updated!');
      await reload();
    } catch (e: any) {
      if (e.status === 429 && e.data?.nextAvailableAt) {
        const dateStr = new Date(e.data.nextAvailableAt).toLocaleDateString(
          lang === "fr" ? "fr-FR" : "en-US",
          { day: "numeric", month: "long", year: "numeric" }
        );
        toast.error(
          lang === "fr"
            ? `Tu pourras réutiliser cette fonctionnalité le ${dateStr}.`
            : `This feature will be available again on ${dateStr}.`
        );
      } else {
        toast.error(e.message || (lang === 'fr' ? "Erreur lors de l'analyse" : 'Analysis error'));
      }
    } finally {
      setImportBusy(false);
    }
  };

  if (!p) return <div className="text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <Card className="relative overflow-hidden p-6 sm:p-8 border-border/50 bg-gradient-card">
        <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
        <div className="relative flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative group">
            <div className="h-20 w-20 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl font-black text-primary-foreground shadow-glow overflow-hidden">
              {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : (p.full_name || user?.email || "A")[0].toUpperCase()}
            </div>
            {p.avatarUrl && (
              <div
                className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 cursor-pointer transition"
                onClick={() => setAvatarLightbox(true)}
                title="Voir la photo"
              >
                <Eye className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{p.preferred_name || p.full_name || user?.firstName || "User Profile"}</h1>
            {p.country && <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" />{[p.city, p.country].filter(Boolean).join(", ")}</div>}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold"><Trophy className="h-3 w-3" /> Lv. {level}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15 text-foreground font-semibold"><Sparkles className="h-3 w-3 text-accent" /> {xp} XP</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted font-semibold"><Flame className="h-3 w-3 text-accent" /> {streak}d</span>
              {p.verifications && Object.values(p.verifications).some(Boolean) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/15 text-success font-semibold"><ShieldCheck className="h-3 w-3" /> Verified</span>
              )}
            </div>
            <div className="mt-2 max-w-xs"><Progress value={xpPct} className="h-1.5" /><div className="text-[10px] text-muted-foreground mt-1">{xpInLevel} / 500 XP → Lv.{level + 1}</div></div>
            <div className="flex flex-wrap gap-2 mt-3">
              {labels.length ? labels.map((l) => <Badge key={l} className="bg-accent/20 text-foreground border-accent/30">{l}</Badge>) : <Badge variant="outline">{t("prof_identity")}</Badge>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">{t("prof_completion")}</div>
            <div className="text-3xl font-bold text-gradient">{completion.score}%</div>
            <Progress value={completion.score} className="h-1.5 mt-2 w-32" />
          </div>
        </div>
        {/* Readiness */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { k: "job", l: t("prof_readiness_job") },
            { k: "internship", l: t("prof_readiness_intern") },
            { k: "freelance", l: t("prof_readiness_freelance") },
            { k: "entrepreneurship", l: t("prof_readiness_entre") },
            { k: "leadership", l: t("prof_readiness_lead") },
          ].map((r) => {
            const v = Number(readiness[r.k as keyof typeof readiness] ?? 0);
            return (
              <div key={r.k} className="rounded-xl bg-background/60 backdrop-blur p-3 border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{r.l}</div>
                <div className="text-lg font-bold mt-1">{v}%</div>
                <Progress value={v} className="h-1 mt-1" />
              </div>
            );
          })}
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">{t("prof_tab_overview")}</TabsTrigger>
          <TabsTrigger value="personal">{t("prof_tab_personal")}</TabsTrigger>
          <TabsTrigger value="education">{t("prof_tab_education")}</TabsTrigger>
          <TabsTrigger value="experience">{t("prof_tab_experience")}</TabsTrigger>
          <TabsTrigger value="skills">{t("prof_tab_skills")}</TabsTrigger>
          <TabsTrigger value="aspirations">{t("prof_tab_aspirations")}</TabsTrigger>
          <TabsTrigger value="portfolio">{t("prof_tab_portfolio")}</TabsTrigger>
          <TabsTrigger value="timeline">{t("prof_tab_timeline")}</TabsTrigger>
          <TabsTrigger value="privacy">{t("prof_tab_privacy")}</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-6">

          {/* Résumé du profil */}
          <Card className="p-6 border-border/50 bg-gradient-card">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">{lang === "fr" ? "Résumé du profil" : "Profile Summary"}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{profileSummary}</p>
                {nextSteps.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {lang === "fr" ? "Prochaines étapes suggérées" : "Suggested next steps"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {nextSteps.map((step) => (
                        <button
                          key={step.tab}
                          onClick={() => setActiveTab(step.tab)}
                          className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="h-3 w-3" />{step.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-gradient">{completion.score}%</div>
                <div className="text-[10px] text-muted-foreground">{lang === "fr" ? "complété" : "complete"}</div>
              </div>
            </div>
          </Card>

          {/* Import IA profil */}
          <Card className="p-6 border-border/50 bg-gradient-card">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Wand2 className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">
                  {lang === 'fr' ? 'Remplir mon profil en un clic' : 'Auto-fill my profile'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {lang === 'fr'
                    ? "Importe ton CV ou colle du texte (lettre de motivation, bio LinkedIn...), l'IA remplit automatiquement les sections de ton profil."
                    : 'Import your CV or paste text (cover letter, LinkedIn bio...), AI automatically fills your profile sections.'}
                </p>

                {importSummary ? (
                  /* ── Result view ─────────────────────────────────────── */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-success font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      {lang === 'fr' ? 'Profil mis à jour !' : 'Profile updated!'}
                    </div>
                    {(
                      importSummary.education_added > 0 ||
                      importSummary.experiences_added > 0 ||
                      importSummary.skills_added > 0 ||
                      importSummary.certifications_added > 0 ||
                      importSummary.portfolio_added > 0 ||
                      importSummary.personal_fields_updated?.length > 0 ||
                      importSummary.aspirations_updated
                    ) ? (
                      <ul className="space-y-1 text-sm">
                        {importSummary.education_added > 0 && (
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                            {importSummary.education_added} {lang === 'fr' ? 'formation(s) ajoutée(s)' : 'education(s) added'}
                          </li>
                        )}
                        {importSummary.experiences_added > 0 && (
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5 text-accent shrink-0" />
                            {importSummary.experiences_added} {lang === 'fr' ? 'expérience(s) ajoutée(s)' : 'experience(s) added'}
                          </li>
                        )}
                        {importSummary.skills_added > 0 && (
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 text-success shrink-0" />
                            {importSummary.skills_added} {lang === 'fr' ? 'compétence(s) ajoutée(s)' : 'skill(s) added'}
                          </li>
                        )}
                        {importSummary.certifications_added > 0 && (
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Award className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                            {importSummary.certifications_added} {lang === 'fr' ? 'certification(s) ajoutée(s)' : 'certification(s) added'}
                          </li>
                        )}
                        {importSummary.portfolio_added > 0 && (
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Layers className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            {importSummary.portfolio_added} {lang === 'fr' ? 'élément(s) de portfolio ajouté(s)' : 'portfolio item(s) added'}
                          </li>
                        )}
                        {importSummary.personal_fields_updated?.length > 0 && (
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5 text-primary shrink-0" />
                            {lang === 'fr' ? 'Infos personnelles complétées' : 'Personal info updated'} : {importSummary.personal_fields_updated.join(', ')}
                          </li>
                        )}
                        {importSummary.aspirations_updated && (
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Target className="h-3.5 w-3.5 text-accent shrink-0" />
                            {lang === 'fr' ? 'Aspirations mises à jour' : 'Aspirations updated'}
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {lang === 'fr'
                          ? 'Aucune nouvelle information détectée dans le document fourni.'
                          : 'No new information detected in the provided document.'}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setImportSummary(null);
                        setImportFile(null);
                        setImportText('');
                      }}
                      className="mt-2"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      {lang === 'fr' ? 'Importer un autre document' : 'Import another document'}
                    </Button>
                  </div>
                ) : (
                  /* ── Input view ──────────────────────────────────────── */
                  <div className="space-y-4">
                    {/* Mode toggle */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImportMode('file')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          importMode === 'file'
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border/50 text-muted-foreground hover:border-accent/40'
                        }`}
                      >
                        <Upload className="h-3 w-3" />
                        {lang === 'fr' ? 'Fichier' : 'File'}
                      </button>
                      <button
                        onClick={() => setImportMode('text')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          importMode === 'text'
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border/50 text-muted-foreground hover:border-accent/40'
                        }`}
                      >
                        <Type className="h-3 w-3" />
                        {lang === 'fr' ? 'Texte' : 'Text'}
                      </button>
                    </div>

                    {importMode === 'file' ? (
                      <div>
                        <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border/50 hover:border-accent/40 cursor-pointer transition-colors bg-muted/20">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <div className="text-sm text-center">
                            <span className="text-accent font-medium">
                              {lang === 'fr' ? 'Choisir un fichier' : 'Choose a file'}
                            </span>
                            <span className="text-muted-foreground">
                              {' — '}PDF, DOCX, TXT
                            </span>
                          </div>
                          {importFile && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {importFile.name}
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                            className="hidden"
                            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                    ) : (
                      <Textarea
                        rows={6}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={
                          lang === 'fr'
                            ? 'Colle ici ton CV, ta bio, ou toute description de ton parcours...'
                            : 'Paste your CV, bio, or any description of your journey here...'
                        }
                      />
                    )}

                    <div className="space-y-1">
                      <Button
                        onClick={runProfileImport}
                        disabled={
                          importBusy ||
                          !!importNextDate ||
                          (importMode === 'file' ? !importFile : !importText.trim())
                        }
                        className="bg-gradient-hero border-0 shadow-glow w-full"
                      >
                        {importBusy ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />{lang === 'fr' ? 'Analyse en cours...' : 'Analyzing...'}</>
                        ) : (
                          <><Wand2 className="h-4 w-4 mr-2" />{lang === 'fr' ? "Lancer l'analyse" : 'Run analysis'}</>
                        )}
                      </Button>
                      {importNextDate && (
                        <p className="text-xs text-muted-foreground text-center">
                          {lang === 'fr' ? 'Disponible le ' : 'Available on '}
                          {importNextDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Aperçu rapide */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: lang === "fr" ? "Formations" : "Education", count: education.length, icon: GraduationCap, tab: "education", color: "text-primary bg-primary/10" },
              { label: lang === "fr" ? "Expériences" : "Experiences", count: exps.length, icon: Briefcase, tab: "experience", color: "text-accent bg-accent/10" },
              { label: lang === "fr" ? "Compétences" : "Skills", count: skills.length, icon: Sparkles, tab: "skills", color: "text-success bg-success/10" },
              { label: lang === "fr" ? "Certifications" : "Certifications", count: certs.length, icon: Award, tab: "education", color: "text-yellow-600 bg-yellow-500/10" },
              { label: "Portfolio", count: portfolio.length, icon: Layers, tab: "portfolio", color: "text-purple-500 bg-purple-500/10" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <button
                  key={stat.tab + stat.label}
                  onClick={() => setActiveTab(stat.tab)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/60 transition-colors text-center group"
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{stat.count}</div>
                  <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                </button>
              );
            })}
          </div>

          {/* Scores */}
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold mb-5">{t("prof_scores")}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {[
                { key: "employability", label: t("score_employability"), value: scores.employability ?? 60 },
                { key: "leadership", label: t("score_leadership"), value: scores.leadership ?? 55 },
                { key: "digital", label: t("score_digital"), value: scores.digital ?? 65 },
                { key: "communication", label: t("score_communication"), value: scores.communication ?? 60 },
                { key: "entrepreneurship", label: t("score_entrepreneurship"), value: scores.entrepreneurship ?? 50 },
                { key: "community", label: t("score_community"), value: scores.community ?? 55 },
              ].map((s) => (
                <Ring key={s.key} value={s.value} label={s.label} quality={scoreQuality(s.value, lang)} />
              ))}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Insights IA */}
            <Card ref={insightsCardRef} className={`p-6 border-border/50 transition-all duration-700 ${insightsHighlighted ? "ring-2 ring-primary/60 shadow-glow" : ""}`}>
              {insightsHighlighted && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 mb-3">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  {lang === "fr" ? "Nouveaux insights générés — retrouvez-les ci-dessous !" : "New insights generated — see them below!"}
                </div>
              )}
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3">
                <h3 className="font-semibold flex items-center gap-2 min-w-0"><Brain className="h-4 w-4 text-primary shrink-0" />{t("prof_ai_insights")}</h3>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <Button size="sm" onClick={runAi} disabled={aiBusy || !!aiInsightsNextDate} className="bg-gradient-hero shadow-glow border-0 whitespace-nowrap">
                    {aiBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {aiBusy ? t("prof_ai_running") : t("prof_ai_run")}
                  </Button>
                  {aiInsightsNextDate && (
                    <span className="text-[10px] text-muted-foreground text-right">
                      {lang === "fr" ? "Disponible le " : "Available on "}
                      {aiInsightsNextDate.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
              {insights.personality && <p className="text-sm text-muted-foreground italic mb-3">"{insights.personality}"</p>}
              {insights.strengths && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-success uppercase">{t("prof_strong")}</div>
                  <div className="flex flex-wrap gap-1 mt-1">{(insights.strengths as string[]).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                </div>
              )}
              {insights.improvements && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-accent uppercase">{t("prof_improve")}</div>
                  <div className="flex flex-wrap gap-1 mt-1">{(insights.improvements as string[]).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
                </div>
              )}
              {(insights[lang === "fr" ? "tips_fr" : "tips_en"] as string[] | undefined)?.length ? (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-xs font-semibold mb-1">{t("prof_ai_tips")}</div>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {(insights[lang === "fr" ? "tips_fr" : "tips_en"] as string[]).map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              ) : null}
              {!insights.personality && (
                completion.score < 30 ? (
                  <div className="p-3 rounded-lg bg-muted/60 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-2">
                      {lang === "fr"
                        ? "Ton profil est encore peu rempli. Complète d'abord tes informations de base pour que l'analyse IA soit pertinente."
                        : "Your profile is still sparse. Complete your basic information first so the AI analysis is meaningful."}
                    </p>
                    <button onClick={() => setActiveTab("personal")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" />{lang === "fr" ? "Compléter mon profil" : "Complete my profile"}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {lang === "fr" ? "Lance l'analyse IA pour découvrir tes forces et axes de progression." : "Run AI analysis to discover your strengths and growth areas."}
                  </p>
                )
              )}
            </Card>

            {/* Badges */}
            <Card className="p-6 border-border/50">
              <h3 className="font-semibold mb-3">{t("prof_badges")}</h3>
              {badges.length === 0 ? (
                <p className="text-sm text-muted-foreground">{lang === "fr" ? "Pas encore de badge — complète ton profil pour en gagner." : "No badges yet — complete your profile to earn them."}</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {badges.map((b: any) => (
                    <div key={b.badge_id} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted text-center">
                      <div className="text-2xl">{b.badges?.icon ?? "🏅"}</div>
                      <div className="text-[11px] font-medium">{lang === "fr" ? b.badges?.name_fr : b.badges?.name_en}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* CV IA */}
            <Card className="p-6 border-border/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{lang === "fr" ? "CV IA" : "AI CV"}</h3>
              <p className="text-sm text-muted-foreground mb-3">{lang === "fr" ? "Génère un CV PDF professionnel basé sur ton profil." : "Generate a professional PDF CV from your profile."}</p>
              <Button onClick={generateCv} disabled={cvBusy} className="bg-gradient-hero shadow-glow border-0 w-full">
                {cvBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                {cvBusy ? t("prof_ai_running") : t("prof_generate_cv")}
              </Button>
              {p.cvUrl && (
                <Button variant="outline" className="w-full mt-2" onClick={downloadCv}>
                  <Download className="h-4 w-4 mr-2" />
                  {lang === "fr" ? "Télécharger mon CV" : "Download my CV"}
                </Button>
              )}
              {p.cvGeneratedAt && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {lang === "fr" ? "Généré le " : "Generated on "}{new Date(p.cvGeneratedAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* PERSONAL */}
        <TabsContent value="personal" className="mt-6">
          {showPersonalForm ? (
            <PersonalForm p={p} t={t} onSave={saveProfile} onClose={() => setShowPersonalForm(false)} />
          ) : (
            <Card className="p-6 border-border/50 bg-gradient-card space-y-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" />{t("prof_personal_info")}</h3>
                <Button size="sm" variant="outline" onClick={() => setShowPersonalForm(true)}>
                  <Edit3 className="h-4 w-4 mr-1.5" />{t("prof_edit") || "Modifier"}
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {[
                  { label: t("prof_preferred_name"), value: p.preferred_name || p.full_name },
                  { label: t("prof_gender"), value: p.gender ? (t(`prof_gender_${p.gender}` as any) || p.gender) : null },
                  { label: t("prof_dob"), value: p.date_of_birth ? fmtDate(p.date_of_birth) : null },
                  { label: t("prof_nationality"), value: p.nationality },
                  { label: t("prof_residence_country") || "Pays de résidence", value: p.residence_country },
                  { label: t("prof_city"), value: p.city },
                  { label: t("prof_phone"), value: p.phone },
                  { label: t("prof_primary_lang") || "Langue préférée", value: p.preferred_language },
                ].map(({ label, value }) => (
                  <div key={String(label)}>
                    <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                    <div className={`font-medium ${!value ? "text-muted-foreground/50 italic text-xs" : ""}`}>{value || "—"}</div>
                  </div>
                ))}
              </div>
              {Array.isArray(p.languages_spoken) && p.languages_spoken.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">{t("prof_languages") || "Langues parlées"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.languages_spoken.map((l: string) => <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}
                  </div>
                </div>
              )}
              {p.bio && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">Bio</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.bio}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm pt-1 border-t border-border/30">
                <div className={`flex items-center gap-2 ${p.willing_to_relocate ? "text-success" : "text-muted-foreground"}`}>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${p.willing_to_relocate ? "bg-success" : "bg-muted-foreground/30"}`} />
                  {t("prof_relocate")}
                </div>
                <div className={`flex items-center gap-2 ${p.remote_available ? "text-success" : "text-muted-foreground"}`}>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${p.remote_available ? "bg-success" : "bg-muted-foreground/30"}`} />
                  {t("prof_remote")}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* EDUCATION */}
        <TabsContent value="education" className="space-y-4 mt-6">
          <EducationSection items={education} t={t} userId={user!.id} reload={reload} />
          <CertificationsSection items={certs} t={t} userId={user!.id} reload={reload} />
        </TabsContent>

        {/* EXPERIENCE */}
        <TabsContent value="experience" className="mt-6">
          <ExperienceSection items={exps} t={t} userId={user!.id} reload={reload} />
        </TabsContent>

        {/* SKILLS */}
        <TabsContent value="skills" className="mt-6">
          <SkillsSection items={skills} t={t} userId={user!.id} reload={reload} />
        </TabsContent>

        {/* ASPIRATIONS */}
        <TabsContent value="aspirations" className="mt-6">
          {showAspirationsForm ? (
            <AspirationsForm p={p} t={t} onSave={saveProfile} onClose={() => setShowAspirationsForm(false)} />
          ) : (
            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowAspirationsForm(true)} className="bg-gradient-hero border-0 shadow-glow">
                <Edit3 className="h-4 w-4 mr-2" />
                {t("prof_tab_aspirations")}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* PORTFOLIO */}
        <TabsContent value="portfolio" className="mt-6 space-y-4">
          {showSocialForm ? (
            <SocialLinksForm p={p} t={t} lang={lang} onSave={saveProfile} onClose={() => setShowSocialForm(false)} />
          ) : (
            <div className="flex justify-center">
              <Button onClick={() => setShowSocialForm(true)} className="bg-gradient-hero border-0 shadow-glow">
                <Edit3 className="h-4 w-4 mr-2" />{t("prof_port_links")}
              </Button>
            </div>
          )}
          <PortfolioSection items={portfolio} t={t} userId={user!.id} reload={reload} />
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="mt-6">
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold mb-4">{t("prof_timeline_title")}</h3>
            {xpEvents.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_timeline_empty")}</p> : (
              <>
                <ul className="space-y-3">
                  {xpEvents.slice((timelinePage - 1) * 6, timelinePage * 6).map((e: any) => (
                    <li key={e.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">+{e.amount} XP · <span className="text-muted-foreground font-normal">{e.label ?? e.reason ?? e.type}</span></div>
                        <div className="text-xs text-muted-foreground">{new Date(e.createdAt ?? e.created_at).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                {Math.ceil(xpEvents.length / 6) > 1 && (
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setTimelinePage((prev) => Math.max(prev - 1, 1))} disabled={timelinePage === 1}>
                      {lang === "fr" ? "Précédent" : "Previous"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTimelinePage((prev) => Math.min(prev + 1, Math.ceil(xpEvents.length / 6)))} disabled={timelinePage === Math.ceil(xpEvents.length / 6)}>
                      {lang === "fr" ? "Suivant" : "Next"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        {/* PRIVACY */}
        <TabsContent value="privacy" className="mt-6 space-y-4">
          <Card className="p-6 border-border/50 bg-gradient-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />{t("prof_privacy_title")}</h3>
            <div className="space-y-2">
              {[
                { v: "public", l: t("prof_privacy_public"), icon: Globe, desc: t("prof_privacy_public_desc") },
                { v: "recruiters", l: t("prof_privacy_recruiters"), icon: Users, desc: t("prof_privacy_recruiters_desc") },
                { v: "private", l: t("prof_privacy_private"), icon: Lock, desc: t("prof_privacy_private_desc") },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = p.visibility === opt.v;
                return (
                  <label key={opt.v} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${active ? "border-primary bg-primary/5 shadow-glow" : "border-border/50 hover:border-primary/30"}`}>
                    <input type="radio" name="vis" checked={active} onChange={() => saveProfile({ visibility: opt.v })} className="sr-only" />
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${active ? "text-foreground" : "text-foreground/80"}`}>{opt.l}</div>
                      {opt.desc && <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>}
                    </div>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </label>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lightbox avatar */}
      {avatarLightbox && p.avatarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setAvatarLightbox(false)}
        >
          <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={p.avatarUrl}
              alt="Photo de profil"
              className="w-full rounded-2xl shadow-2xl object-cover"
            />
            <button
              onClick={() => setAvatarLightbox(false)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Sub-forms --- */

const COMMON_LANGUAGES = [
  "Français", "English", "Arabe", "Portugais", "Wolof", "Haoussa",
  "Bambara", "Peul / Fulfulde", "Dioula", "Lingala", "Yoruba", "Igbo",
  "Twi", "Moore", "Soninké", "Mandingue",
];

function PersonalForm({ p, t, onSave, onClose }: any) {
  const { lang } = useLang();
  const initialLangs = Array.isArray(p.languages_spoken) ? p.languages_spoken : [];
  const knownChecked = initialLangs.filter((l: string) => COMMON_LANGUAGES.includes(l));
  const otherLangs = initialLangs.filter((l: string) => !COMMON_LANGUAGES.includes(l));

  const [f, setF] = useState({
    preferred_name: p.preferred_name || p.full_name || "",
    gender: p.gender ?? "",
    date_of_birth: p.date_of_birth ? (p.date_of_birth as string).split("T")[0] : "",
    nationality: p.nationality ?? "",
    residence_country: p.residence_country ?? "",
    city: p.city ?? "",
    phone: p.phone ?? "",
    preferred_language: p.preferred_language ?? "",
    willing_to_relocate: !!p.willing_to_relocate,
    remote_available: p.remote_available ?? true,
    bio: p.bio ?? "",
  });
  const [checkedLangs, setCheckedLangs] = useState<string[]>(knownChecked);
  const [otherLangText, setOtherLangText] = useState(otherLangs.join(", "));
  const [showOtherLang, setShowOtherLang] = useState(otherLangs.length > 0);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(p.avatarUrl || null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [countriesRes, languagesRes] = await Promise.all([
          profileAPI.getCountries(),
          profileAPI.getLanguages(),
        ]);
        setCountries(countriesRes.countries || []);
        setLanguages(languagesRes.languages || []);
        // Load cities based on residence_country
        const rc = p.residence_country;
        if (rc) {
          const citiesRes = await profileAPI.getCities(rc);
          setCities(citiesRes.cities || []);
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      }
    };
    load();
  }, []);

  const handleNationalityChange = (value: string) => {
    setF(prev => ({ ...prev, nationality: value }));
  };

  const handleResidenceCountryChange = async (value: string) => {
    setF(prev => {
      const dialCode = value ? (COUNTRY_DIAL_CODES[value] ?? "") : "";
      const newPhone = !prev.phone && dialCode ? dialCode + " " : prev.phone;
      return { ...prev, residence_country: value, city: "", phone: newPhone };
    });
    if (!value) { setCities([]); return; }
    setLoadingCities(true);
    try {
      const res = await profileAPI.getCities(value);
      setCities(res.cities || []);
    } catch { setCities([]); }
    finally { setLoadingCities(false); }
  };

  const toggleLang = (lang: string) => {
    setCheckedLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleAvatarChange = async (file: File) => {
    if (!p.id) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarUploading(true);
    try {
      const { avatarUrl } = await profileAPI.uploadAvatar(p.id, file);
      setAvatarPreview(avatarUrl);
      toast.success(lang === "fr" ? "Photo de profil mise à jour" : "Profile picture updated");
    } catch (err: any) {
      toast.error(err.message || (lang === "fr" ? "Erreur lors de l'upload" : "Upload failed"));
      setAvatarPreview(p.avatarUrl || null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const validate = () => {
    if (!f.preferred_name.trim()) {
      toast.error(lang === "fr" ? "Le nom préféré est requis." : "Preferred name is required.");
      return false;
    }
    if (f.preferred_name.trim().length > 100) {
      toast.error(lang === "fr" ? "Le nom préféré ne doit pas dépasser 100 caractères." : "Preferred name must be at most 100 characters.");
      return false;
    }
    if (f.date_of_birth) {
      const dob = new Date(f.date_of_birth);
      const ageDiff = Date.now() - dob.getTime();
      const age = new Date(ageDiff).getUTCFullYear() - 1970;
      if (age < 13) {
        toast.error(lang === "fr" ? "Tu dois avoir au moins 13 ans." : "You must be at least 13 years old.");
        return false;
      }
    }
    if (f.phone && !/^\+?[\d\s\-().]{8,20}$/.test(f.phone)) {
      toast.error(lang === "fr" ? "Numéro de téléphone invalide." : "Invalid phone number.");
      return false;
    }
    if (f.bio.length > 500) {
      toast.error(lang === "fr" ? "La bio ne doit pas dépasser 500 caractères." : "Bio must be at most 500 characters.");
      return false;
    }
    if (showOtherLang && otherLangText.trim() && otherLangText.trim().length < 2) {
      toast.error(lang === "fr" ? "Précise les autres langues." : "Please specify other languages.");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    const allLangs = [
      ...checkedLangs,
      ...(showOtherLang && otherLangText.trim()
        ? otherLangText.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []),
    ];
    setSaving(true);
    try {
      await onSave({ ...f, languages_spoken: allLangs });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const genderOptions = [
    { code: "male", label: t("prof_gender_male") || "Homme" },
    { code: "female", label: t("prof_gender_female") || "Femme" },
  ];

  return (
    <Card className="p-6 border-border/50 bg-gradient-card space-y-6">
      <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" />{t("prof_personal_info")}</h3>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative group shrink-0">
          <div className="h-20 w-20 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl font-black text-primary-foreground shadow-glow overflow-hidden">
            {avatarPreview
              ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              : (f.preferred_name || p.full_name || "A")[0].toUpperCase()}
          </div>
          {avatarUploading && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
          )}
          {!avatarUploading && (
            <label className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition">
              <Camera className="h-5 w-5 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
              />
            </label>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{lang === "fr" ? "Photo de profil" : "Profile picture"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === "fr" ? "JPG, PNG ou WebP · max 5 Mo" : "JPG, PNG or WebP · max 5 MB"}
          </p>
        </div>
      </div>

      {/* Identité */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Identité</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("prof_preferred_name")}>
            <Input
              value={f.preferred_name}
              onChange={(e) => setF(prev => ({ ...prev, preferred_name: e.target.value }))}
              maxLength={100}
            />
          </Field>
          <Field label={t("prof_gender")}>
            <Select value={f.gender || "null"} onValueChange={(v) => setF(prev => ({ ...prev, gender: v === "null" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder={t("prof_select_gender") || "Sélectionner"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t("prof_not_specified") || "Non précisé"}</SelectItem>
                {genderOptions.map((g) => <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("prof_dob")}>
            <Input type="date" value={f.date_of_birth} onChange={(e) => setF(prev => ({ ...prev, date_of_birth: e.target.value }))} />
          </Field>
          <Field label={t("prof_nationality")}>
            <Select value={f.nationality || "null"} onValueChange={(v) => handleNationalityChange(v === "null" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("prof_select_country") || "Sélectionner"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t("prof_not_specified") || "Non précisé"}</SelectItem>
                {countries.map((c) => <SelectItem key={c.code} value={c.code}>{c.name_fr || c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* Localisation */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Localisation</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("prof_residence_country") || "Pays de résidence"}>
            <Select value={f.residence_country || "null"} onValueChange={(v) => handleResidenceCountryChange(v === "null" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("prof_select_country") || "Sélectionner"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t("prof_not_specified") || "Non précisé"}</SelectItem>
                {countries.map((c) => <SelectItem key={c.code} value={c.code}>{c.name_fr || c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("prof_city")}>
            {loadingCities ? (
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />{t("loading") || "Chargement..."}
              </div>
            ) : (
              <Select
                value={f.city || "null"}
                onValueChange={(v) => setF(prev => ({ ...prev, city: v === "null" ? "" : v }))}
                disabled={!f.residence_country || cities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={f.residence_country ? t("prof_select_city") || "Sélectionner une ville" : t("prof_select_country_first") || "Choisir un pays d'abord"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">{t("prof_not_specified") || "Non précisé"}</SelectItem>
                  {cities.map((c, idx) => <SelectItem key={idx} value={c.name}>{c.name_fr || c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </Field>
        </div>
      </div>

      {/* Contact & Langue */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Contact & Langue</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("prof_phone")}>
            <Input
              value={f.phone}
              onChange={(e) => setF(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+221 77 000 00 00"
            />
          </Field>
          <Field label={t("prof_primary_lang") || "Langue préférée"}>
            <Select value={f.preferred_language || "null"} onValueChange={(v) => setF(prev => ({ ...prev, preferred_language: v === "null" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder={t("prof_select_language") || "Sélectionner"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t("prof_not_specified") || "Non précisé"}</SelectItem>
                {languages.map((l) => <SelectItem key={l.code} value={l.code}>{l.name_fr || l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* Langues parlées — checkboxes */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" />{t("prof_languages") || "Langues parlées"}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMMON_LANGUAGES.map((lang) => (
            <label key={lang} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${checkedLangs.includes(lang) ? "border-primary/50 bg-primary/5 text-primary" : "border-border/40 bg-muted/30 hover:border-border"}`}>
              <input
                type="checkbox"
                className="accent-primary"
                checked={checkedLangs.includes(lang)}
                onChange={() => toggleLang(lang)}
              />
              {lang}
            </label>
          ))}
          <label className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${showOtherLang ? "border-primary/50 bg-primary/5 text-primary" : "border-border/40 bg-muted/30 hover:border-border"}`}>
            <input
              type="checkbox"
              className="accent-primary"
              checked={showOtherLang}
              onChange={() => setShowOtherLang(v => !v)}
            />
            {lang === "fr" ? "Autres" : "Others"}
          </label>
        </div>
        {showOtherLang && (
          <Input
            value={otherLangText}
            onChange={(e) => setOtherLangText(e.target.value)}
            placeholder={lang === "fr" ? "Ex : Tigrinia, Swahili..." : "E.g. Swahili, Tigrinya..."}
          />
        )}
      </div>

      {/* Bio */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bio</div>
        <Field label={`${t("prof_bio")} (${f.bio.length}/500)`}>
          <Textarea
            rows={3}
            value={f.bio}
            onChange={(e) => setF(prev => ({ ...prev, bio: e.target.value }))}
            maxLength={500}
            className={f.bio.length > 450 ? "border-amber-500/50" : ""}
          />
        </Field>
      </div>

      {/* Disponibilité */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Disponibilité</div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={f.willing_to_relocate} onCheckedChange={(v) => setF(prev => ({ ...prev, willing_to_relocate: v }))} />
            {t("prof_relocate")}
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={f.remote_available} onCheckedChange={(v) => setF(prev => ({ ...prev, remote_available: v }))} />
            {t("prof_remote")}
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>{lang === "fr" ? "Annuler" : "Cancel"}</Button>
        <Button onClick={submit} disabled={saving} className="bg-gradient-hero border-0 shadow-glow">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {t("prof_save")}
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

/* EDUCATION */
function EducationSection({ items, t, userId, reload }: any) {
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4" />{t("prof_tab_education")}</h3>
        <EduDialog userId={userId} t={t} reload={reload} />
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_edu_empty")}</p> : (
        <ul className="space-y-3">
          {items.map((e: Edu) => (
            <li key={(e as any)._id ?? e.id} className="flex items-start justify-between gap-3 p-4 rounded-xl bg-muted/40 border border-border/40 hover:border-primary/20 transition-colors">
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{e.field || "—"}</div>
                  <div className="text-sm text-muted-foreground">{e.degree && <span className="mr-1">{e.degree} ·</span>}{e.institution}{e.country ? `, ${e.country}` : ""}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(e.startDate)} → {e.currentlyStudying ? "présent" : fmtDate(e.endDate)}</div>
                  {e.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <EditEduDialog education={e} userId={userId} t={t} reload={reload} />
                <Button size="icon" variant="ghost" onClick={async () => {
                  const eid = e.id ?? (e as any)._id;
                  if (!eid) { toast.error("ID introuvable — rechargez la page"); return; }
                  try {
                    await profileAPI.deleteEducation(userId, eid);
                    toast.success("Formation supprimée");
                    reload();
                  } catch (err: any) {
                    toast.error(err.message || "Erreur lors de la suppression");
                  }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EduDialog({ userId, t, reload }: any) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Edu>({ institution: "", degree: "", field: "", country: "", currentlyStudying: false });
  const degreeOptions = useMemo(() => getDegreeListByLang(lang as "en" | "fr"), [lang]);

  const submit = async () => {
    if (!f.institution) return toast.error("Institution required");
    setLoading(true);
    try {
      await profileAPI.addEducation(userId, {
        school: f.institution,
        degree: f.degree,
        field: f.field,
        country: f.country,
        startDate: f.startDate,
        endDate: f.endDate,
        currentlyStudying: f.currentlyStudying,
        description: f.description,
      });
      await awardXp(userId, 25, "added_education");
      setOpen(false);
      setF({ institution: "" });
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="bg-gradient-hero border-0 shadow-glow"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />{t("prof_tab_education")}</DialogTitle>
          <DialogDescription>Ajouter une nouvelle formation</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[55vh] space-y-4 pr-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("prof_edu_degree")}>
              <Select value={f.degree || "null"} onValueChange={(v) => setF({ ...f, degree: v === "null" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder={t("prof_select_degree") || "Select degree"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">{t("prof_not_specified") || "Not specified"}</SelectItem>
                  {degreeOptions.map((deg) => (
                    <SelectItem key={deg.value} value={deg.value}>{deg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("prof_edu_field")}><Input value={f.field ?? ""} onChange={(e) => setF({ ...f, field: e.target.value })} /></Field>
            <Field label={t("prof_edu_institution")}><Input value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></Field>
            <Field label={t("prof_edu_country")}><Input value={f.country ?? ""} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
            <Field label={t("prof_edu_start")}><Input type="date" value={f.startDate ?? ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
            <Field label={t("prof_edu_end")}><Input type="date" value={f.endDate ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} disabled={f.currentlyStudying} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.currentlyStudying} onCheckedChange={(v) => setF({ ...f, currentlyStudying: v })} />{t("prof_edu_current")}</label>
          <Field label={t("prof_edu_achievements")}><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>{t("prof_cancel")}</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("prof_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* EDIT EDUCATION DIALOG */
function EditEduDialog({ education, userId, t, reload }: any) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Edu>({
    id: education.id ?? education._id,
    institution: education.school ?? "",
    degree: education.degree ?? "",
    field: education.field ?? "",
    country: education.country ?? "",
    startDate: education.startDate ? new Date(education.startDate).toISOString().split('T')[0] : "",
    endDate: education.endDate ? new Date(education.endDate).toISOString().split('T')[0] : "",
    currentlyStudying: education.currentlyStudying ?? false,
    description: education.description ?? "",
  });
  const degreeOptions = useMemo(() => getDegreeListByLang(lang as "en" | "fr"), [lang]);

  const submit = async () => {
    if (!f.institution) return toast.error("Institution required");
    try {
      await profileAPI.updateEducation(userId, f.id!, {
        school: f.institution,
        degree: f.degree,
        field: f.field,
        country: f.country,
        startDate: f.startDate,
        endDate: f.endDate,
        currentlyStudying: f.currentlyStudying,
        description: f.description,
      });
      toast.success(t("prof_saved"));
      setOpen(false);
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><Edit3 className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />{t("prof_edit")} {t("prof_tab_education")}</DialogTitle>
          <DialogDescription>Modifier une formation</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[55vh] space-y-4 pr-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("prof_edu_degree")}>
              <Select value={f.degree || "null"} onValueChange={(v) => setF({ ...f, degree: v === "null" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder={t("prof_select_degree") || "Select degree"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">{t("prof_not_specified") || "Not specified"}</SelectItem>
                  {degreeOptions.map((deg) => (
                    <SelectItem key={deg.value} value={deg.value}>{deg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("prof_edu_field")}><Input value={f.field ?? ""} onChange={(e) => setF({ ...f, field: e.target.value })} /></Field>
            <Field label={t("prof_edu_institution")}><Input value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></Field>
            <Field label={t("prof_edu_country")}><Input value={f.country ?? ""} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
            <Field label={t("prof_edu_start")}><Input type="date" value={f.startDate ?? ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
            <Field label={t("prof_edu_end")}><Input type="date" value={f.endDate ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} disabled={f.currentlyStudying} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.currentlyStudying} onCheckedChange={(v) => setF({ ...f, currentlyStudying: v })} />{t("prof_edu_current")}</label>
          <Field label={t("prof_edu_achievements")}><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button>
          <Button onClick={submit} className="bg-gradient-hero border-0 shadow-glow">{t("prof_save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* CERTIFICATIONS */
function CertificationsSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Cert>({ name: "" });
  const submit = async () => {
    if (!f.name) return;
    setLoading(true);
    try {
      await profileAPI.addCertification(userId, {
        title: f.name,
        issuer: f.issuer,
        issueDate: f.issueDate || f.issue_date,
        url: f.credentialUrl || f.credential_url,
      });
      await awardXp(userId, 20, "added_certification");
      setOpen(false);
      setF({ name: "" });
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-primary" />{t("prof_cert_section")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-gradient-hero border-0 shadow-glow"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />{t("prof_cert_section")}</DialogTitle>
              <DialogDescription>Ajouter une certification</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label={t("prof_cert_name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label={t("prof_cert_issuer")}><Input value={f.issuer ?? ""} onChange={(e) => setF({ ...f, issuer: e.target.value })} /></Field>
              <Field label={t("prof_cert_date")}><Input type="date" value={f.issueDate ?? f.issue_date ?? ""} onChange={(e) => setF({ ...f, issueDate: e.target.value })} /></Field>
              <Field label={t("prof_cert_url")}><Input value={f.credentialUrl ?? f.credential_url ?? ""} onChange={(e) => setF({ ...f, credentialUrl: e.target.value })} /></Field>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>{t("prof_cancel")}</Button>
              <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("prof_save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_cert_empty")}</p> : (
        <ul className="space-y-2">
          {items.map((c: Cert) => (
            <li key={(c as any)._id ?? c.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border/40 hover:border-primary/20 transition-colors">
              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Award className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.issuer}</div>
                  {(c.issueDate ?? c.issue_date) && <Badge variant="outline" className="text-[10px] mt-1 px-1.5 py-0">{fmtDate(c.issueDate ?? c.issue_date)}</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <EditCertificationDialog certification={c} userId={userId} t={t} reload={reload} />
                <Button size="icon" variant="ghost" onClick={async () => {
                  const cid = c.id ?? (c as any)._id;
                  if (!cid) { toast.error("ID introuvable — rechargez la page"); return; }
                  try {
                    await profileAPI.deleteCertification(userId, cid);
                    toast.success("Certification supprimée");
                    reload();
                  } catch (err: any) {
                    toast.error(err.message || "Erreur lors de la suppression");
                  }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* EDIT CERTIFICATION DIALOG */
function EditCertificationDialog({ certification, userId, t, reload }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Cert>({
    id: certification.id ?? certification._id,
    name: certification.name ?? certification.title ?? "",
    issuer: certification.issuer ?? "",
    issueDate: certification.issueDate ? new Date(certification.issueDate).toISOString().split('T')[0] : (certification.issue_date ?? ""),
    credentialUrl: certification.credentialUrl ?? certification.credential_url ?? "",
  });

  const submit = async () => {
    if (!f.name) return toast.error("Certification name required");
    try {
      await profileAPI.updateCertification(userId, f.id!, {
        title: f.name,
        issuer: f.issuer,
        issueDate: f.issueDate,
        url: f.credentialUrl,
      });
      toast.success(t("prof_saved"));
      setOpen(false);
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><Edit3 className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />{t("prof_edit")} {t("prof_cert_section")}</DialogTitle>
          <DialogDescription>Modifier une certification</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={t("prof_cert_name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={t("prof_cert_issuer")}><Input value={f.issuer ?? ""} onChange={(e) => setF({ ...f, issuer: e.target.value })} /></Field>
          <Field label={t("prof_cert_date")}><Input type="date" value={f.issueDate ?? ""} onChange={(e) => setF({ ...f, issueDate: e.target.value })} /></Field>
          <Field label={t("prof_cert_url")}><Input value={f.credentialUrl ?? ""} onChange={(e) => setF({ ...f, credentialUrl: e.target.value })} /></Field>
        </div>
        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button>
          <Button onClick={submit} className="bg-gradient-hero border-0 shadow-glow">{t("prof_save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* EXPERIENCE */
function ExperienceSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Exp>({ role: "", kind: "job", isCurrent: false });
  const kinds = ["job", "intern", "volunteer", "freelance", "entre", "community"];
  const kindLabel = (k: string) => t(`prof_exp_kind_${k}` as any);
  
  const submit = async () => {
    // Validation des champs obligatoires
    if (!f.role?.trim()) {
      toast.error(t("prof_exp_role") + " - " + t("prof_required"));
      return;
    }
    if (!f.kind) {
      toast.error(t("prof_exp_kind") + " - " + t("prof_required"));
      return;
    }
    if (!f.startDate) {
      toast.error(t("prof_edu_start") + " - " + t("prof_required"));
      return;
    }
    if (!f.isCurrent && !f.endDate) {
      toast.error(t("prof_edu_end") + " - " + t("prof_required"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: f.role.trim(),
        organization: f.organization?.trim() || null,
        sector: f.sector?.trim() || null,
        kind: f.kind,
        startDate: f.startDate,
        endDate: f.isCurrent ? null : f.endDate,
        isCurrent: f.isCurrent ?? false,
        description: f.description?.trim() || null,
        impact: f.impact?.trim() || null,
        teamSize: f.teamSize || null,
      };
      await profileAPI.addExperience(userId, payload);
      await awardXp(userId, 15, "added_experience");
      toast.success(t("prof_added_exp") ?? "Expérience ajoutée !");
      setOpen(false);
      setF({ role: "", kind: "job", isCurrent: false });
      reload();
    } catch (err: any) {
      console.error("Erreur complète lors de l'ajout:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message ?? err.message ?? t("prof_error_add"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />{t("prof_tab_experience")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-gradient-hero border-0 shadow-glow"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />{t("prof_tab_experience")}</DialogTitle>
              <DialogDescription>Ajouter une expérience professionnelle</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[55vh] space-y-4 pr-1">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={<span>{t("prof_exp_role")} <span className="text-red-500">*</span></span>}><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Ex: Développeur senior" /></Field>
                <Field label={t("prof_exp_org")}><Input value={f.organization ?? ""} onChange={(e) => setF({ ...f, organization: e.target.value })} placeholder="Organisation ou entreprise" /></Field>
                <Field label={t("prof_exp_sector")}><Input value={f.sector ?? ""} onChange={(e) => setF({ ...f, sector: e.target.value })} placeholder="Ex: Tech, Finance..." /></Field>
                <Field label={<span>{t("prof_exp_kind")} <span className="text-red-500">*</span></span>}>
                  <Select value={f.kind ?? "job"} onValueChange={(v) => setF({ ...f, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{kinds.map((k) => <SelectItem key={k} value={k}>{kindLabel(k)}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={<span>{t("prof_edu_start")} <span className="text-red-500">*</span></span>}><Input type="date" value={f.startDate ?? f.start_date ?? ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
                <Field label={<span>{t("prof_edu_end")} {!f.isCurrent && <span className="text-red-500">*</span>}</span>}><Input type="date" value={f.endDate ?? f.end_date ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} disabled={f.isCurrent ?? f.is_current} /></Field>
                <Field label={t("prof_exp_team")}><Input type="number" value={f.teamSize ?? f.team_size ?? ""} onChange={(e) => setF({ ...f, teamSize: parseInt(e.target.value) || undefined })} placeholder="Taille de l'équipe" /></Field>
                <Field label=""><label className="flex items-center gap-2"><Switch checked={f.isCurrent ?? false} onCheckedChange={(v) => setF({ ...f, isCurrent: v })} /><span className="text-sm">{t("prof_exp_current")}</span></label></Field>
              </div>
              <Field label={t("prof_exp_description")}><Textarea rows={3} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Décrivez vos responsabilités..." /></Field>
              <Field label={t("prof_exp_impact")}><Input value={f.impact ?? ""} onChange={(e) => setF({ ...f, impact: e.target.value })} placeholder="Ex: Augmentation de 30% de la productivité" /></Field>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>{t("prof_cancel")}</Button>
              <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("prof_save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_exp_empty")}</p> : (
        <ul className="space-y-3">
          {items.map((e: any, index: number) => (
            <li key={e.id ?? e.experience_id ?? e._id ?? index} className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/40 hover:border-primary/20 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-2 justify-between">
                  <div>
                    <div className="font-semibold">{e.role}</div>
                    {e.organization && <div className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{e.organization}</div>}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{kindLabel(e.kind ?? "job")}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(e.startDate)} → {e.isCurrent ? "présent" : fmtDate(e.endDate)}</div>
                {e.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                {e.impact && <p className="text-xs text-accent mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />{e.impact}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <EditExperienceDialog experience={e} userId={userId} t={t} reload={reload} />
                <Button size="icon" variant="ghost" onClick={async () => {
                  const itemId = e.id ?? e.experience_id ?? e._id;
                  if (!itemId) return toast.error("ID introuvable");
                  if (!window.confirm("Supprimer cette expérience ?")) return;
                  try {
                    await profileAPI.deleteExperience(userId, itemId);
                    toast.success("Expérience supprimée");
                    reload();
                  } catch (err: any) {
                    toast.error(err.message || "Erreur lors de la suppression");
                  }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* EDIT EXPERIENCE DIALOG */
function EditExperienceDialog({ experience, userId, t, reload }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Exp>({
    id: experience.id ?? experience.experience_id ?? experience._id,
    role: experience.role ?? experience.title ?? "",
    kind: experience.kind ?? experience.type ?? "job",
    organization: experience.organization ?? experience.company ?? "",
    sector: experience.sector ?? experience.location ?? "",
    startDate: experience.startDate
      ? experience.startDate.split("T")[0]
      : experience.start_date
      ? experience.start_date.split("T")[0]
      : "",
    endDate: experience.endDate
      ? experience.endDate.split("T")[0]
      : experience.end_date
      ? experience.end_date.split("T")[0]
      : "",
    isCurrent: experience.isCurrent ?? experience.is_current ?? experience.currentlyWorking ?? experience.currently_working ?? false,
    description: experience.description ?? "",
    impact: experience.impact ?? "",
    teamSize: experience.teamSize ?? experience.team_size ?? undefined,
  });
  const kinds = ["job", "intern", "volunteer", "freelance", "entre", "community"];
  const kindLabel = (k: string) => t(`prof_exp_kind_${k}` as any);

  const submit = async () => {
    // Validation des champs obligatoires
    if (!f.role?.trim()) {
      toast.error(t("prof_exp_role") + " - " + t("prof_required"));
      return;
    }
    if (!f.kind) {
      toast.error(t("prof_exp_kind") + " - " + t("prof_required"));
      return;
    }
    if (!f.startDate) {
      toast.error(t("prof_edu_start") + " - " + t("prof_required"));
      return;
    }
    if (!f.isCurrent && !f.endDate) {
      toast.error(t("prof_edu_end") + " - " + t("prof_required"));
      return;
    }

    const itemId = f.id ?? (experience.id ?? experience.experience_id ?? experience._id);
    if (!f.role?.trim()) return toast.error("Rôle requis");
    if (!itemId) return toast.error("ID introuvable — rechargez la page");
    setLoading(true);
    try {
      const payload = {
        title: f.role.trim(),
        company: f.organization?.trim() || null,
        location: f.sector?.trim() || null,
        kind: f.kind ?? "job",
        startDate: f.startDate ? f.startDate.split("T")[0] : null,
        endDate: f.isCurrent ? null : (f.endDate ? f.endDate.split("T")[0] : null),
        currentlyWorking: f.isCurrent ?? false,
        description: f.description?.trim() || null,
        impact: f.impact?.trim() || null,
        teamSize: f.teamSize ? Number(f.teamSize) : null,
      };
      await profileAPI.updateExperience(userId, itemId, payload);
      toast.success(t("prof_saved"));
      setOpen(false);
      reload();
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour:", err);
      toast.error(err.response?.data?.message ?? err.message ?? t("prof_error_update"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><Edit3 className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />{t("prof_edit")} {t("prof_tab_experience")}</DialogTitle>
          <DialogDescription>Modifier une expérience</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[55vh] space-y-4 pr-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={<span>{t("prof_exp_role")} <span className="text-red-500">*</span></span>}><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Ex: Développeur senior" /></Field>
            <Field label={t("prof_exp_org")}><Input value={f.organization ?? ""} onChange={(e) => setF({ ...f, organization: e.target.value })} placeholder="Organisation ou entreprise" /></Field>
            <Field label={t("prof_exp_sector")}><Input value={f.sector ?? ""} onChange={(e) => setF({ ...f, sector: e.target.value })} placeholder="Ex: Tech, Finance..." /></Field>
            <Field label={<span>{t("prof_exp_kind")} <span className="text-red-500">*</span></span>}>
              <Select value={f.kind ?? "job"} onValueChange={(v) => setF({ ...f, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{kinds.map((k) => <SelectItem key={k} value={k}>{kindLabel(k)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={<span>{t("prof_edu_start")} <span className="text-red-500">*</span></span>}><Input type="date" value={f.startDate ?? ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
            <Field label={<span>{t("prof_edu_end")} {!f.isCurrent && <span className="text-red-500">*</span>}</span>}><Input type="date" value={f.endDate ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} disabled={f.isCurrent} /></Field>
            <Field label={t("prof_exp_team")}>
              <Input type="number" value={f.teamSize ?? ""} onChange={(e) => setF({ ...f, teamSize: parseInt(e.target.value) || undefined })} min={1} />
            </Field>
            <Field label=""><label className="flex items-center gap-2"><Switch checked={f.isCurrent ?? false} onCheckedChange={(v) => setF({ ...f, isCurrent: v })} /><span className="text-sm">{t("prof_exp_current")}</span></label></Field>
          </div>
          <Field label={t("prof_exp_description")}><Textarea rows={3} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Décrivez vos responsabilités..." /></Field>
          <Field label={t("prof_exp_impact")}><Input value={f.impact ?? ""} onChange={(e) => setF({ ...f, impact: e.target.value })} placeholder="Ex: Augmentation de 30% de la productivité" /></Field>
        </div>
        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>{t("prof_cancel")}</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("prof_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* SKILLS */
function SkillsSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Skill>({ name: "", category: "digital", level: 2 });
  const cats = ["digital", "ai", "communication", "leadership", "entrepreneurship", "technical", "creative", "community", "language", "research", "pm"];
  const grouped = useMemo(() => {
    const g: Record<string, Skill[]> = {};
    items.forEach((s: Skill) => { (g[s.category] ||= []).push(s); });
    return g;
  }, [items]);
  const submit = async () => {
    if (!f.name) return;
    setLoading(true);
    try {
      await profileAPI.addSkill(userId, { ...f, user_id: userId });
      await awardXp(userId, 10, "added_skill");
      setOpen(false); setF({ name: "", category: "digital", level: 2 }); reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{t("prof_tab_skills")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-gradient-hero border-0 shadow-glow"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{t("prof_tab_skills")}</DialogTitle>
              <DialogDescription>Ajouter une compétence</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label={t("prof_skill_name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label={t("prof_skill_category")}>
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{t(`prof_skill_cat_${c}` as any)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("prof_skill_level")}>
                <Select value={String(f.level)} onValueChange={(v) => setF({ ...f, level: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4].map((l) => <SelectItem key={l} value={String(l)}>{t(`prof_skill_lvl_${l}` as any)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>{t("prof_cancel")}</Button>
              <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("prof_save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_skill_empty")}</p> : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Layers className="h-3 w-3" />{t(`prof_skill_cat_${cat}` as any)}</div>
              <div className="flex flex-wrap gap-2">
                {(list as Skill[]).map((s) => {
                  const v = ((s.validations as any)?.peer ?? 0) + ((s.validations as any)?.mentor ?? 0) + ((s.validations as any)?.org ?? 0);
                  return (
                    <div key={(s as any).id ?? (s as any).skill_id ?? (s as any)._id ?? s.name} className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${skillLevelColor(s.level)}`}>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs opacity-70">· {t(`prof_skill_lvl_${s.level}` as any)}</span>
                      {v > 0 && <span className="text-xs text-success font-semibold">✓{v}</span>}
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <EditSkillDialog skill={s} userId={userId} t={t} reload={reload} />
                        <button onClick={async () => {
                          const itemId = (s as any).id ?? (s as any).skill_id ?? (s as any)._id;
                          if (!itemId) return toast.error("ID introuvable");
                          if (!window.confirm("Supprimer cette compétence ?")) return;
                          try {
                            await profileAPI.deleteSkill(userId, itemId);
                            toast.success("Compétence supprimée");
                            reload();
                          } catch (err: any) {
                            toast.error(err.message || "Erreur lors de la suppression");
                          }
                        }} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* EDIT SKILL DIALOG */
function EditSkillDialog({ skill, userId, t, reload }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Skill>({
    id: skill.id ?? skill.skill_id ?? skill._id,
    name: skill.name ?? "",
    category: skill.category ?? "digital",
    level: skill.level ?? 2,
  });
  const cats = ["digital", "ai", "communication", "leadership", "entrepreneurship", "technical", "creative", "community", "language", "research", "pm"];

  const submit = async () => {
    if (!f.name?.trim()) return toast.error("Nom de la compétence requis");
    if (!f.id) return toast.error("ID introuvable — rechargez la page");
    setLoading(true);
    try {
      await profileAPI.updateSkill(userId, f.id, {
        name: f.name.trim(),
        category: f.category,
        level: f.level,
      });
      toast.success(t("prof_saved"));
      setOpen(false);
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="hover:text-primary"><Edit3 className="h-3 w-3" /></button></DialogTrigger>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{t("prof_edit")} {t("prof_tab_skills")}</DialogTitle>
          <DialogDescription>Modifier une compétence</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={t("prof_skill_name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={t("prof_skill_category")}>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{t(`prof_skill_cat_${c}` as any)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("prof_skill_level")}>
            <Select value={String(f.level)} onValueChange={(v) => setF({ ...f, level: parseInt(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((l) => <SelectItem key={l} value={String(l)}>{t(`prof_skill_lvl_${l}` as any)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("prof_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* EDIT PORTFOLIO ITEM DIALOG */
function EditPortfolioItemDialog({ item, userId, t, reload }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Port>({
    id: item.id ?? item._id,
    title: item.title ?? "",
    kind: item.kind ?? "project",
    url: item.url ?? "",
    description: item.description ?? "",
  });

  const submit = async () => {
    if (!f.title?.trim()) return toast.error("Portfolio title required");
    if (!f.id) return toast.error("ID introuvable — rechargez la page");
    setLoading(true);
    try {
      await profileAPI.updatePortfolioItem(userId, f.id!, {
        title: f.title.trim(),
        kind: f.kind,
        description: f.description ?? "",
        url: f.url ?? "",
      });
      toast.success(t("prof_saved"));
      setOpen(false);
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}><Edit3 className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />{t("prof_edit")} {t("prof_port_projects")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={t("prof_port_item_title")}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label={t("prof_port_item_kind")}>
            <Select value={f.kind ?? "project"} onValueChange={(v) => setF({ ...f, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["project", "publication", "research", "impact"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("prof_port_item_url")}><Input value={f.url ?? ""} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
          <Field label={t("prof_exp_description")}><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("prof_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ASPIRATIONS */
function AspirationsForm({ p, t, onSave, onClose }: any) {
  const { tArray } = useLang();
  const rawIndustries = tArray("prof_aspir_industries_options");
  const industryOptions = rawIndustries.length ? rawIndustries : [
    "Tech", "Education", "Healthcare", "Finance", "Agriculture", "Environment",
    "Media", "Art & Culture", "NGO", "Government", "Commerce", "Energy",
    "Transport", "Real Estate", "Tourism", "Sport", "Fashion", "Food"
  ];
  const rawCauses = tArray("prof_aspir_causes_options");
  const causeOptions = rawCauses.length ? rawCauses : [
    "Gender equality", "Education for all", "Climate & Environment",
    "Public health", "Poverty reduction", "Human rights",
    "Digital inclusion", "Youth entrepreneurship", "Peace & Security",
    "Sustainable agriculture", "Water & Sanitation", "Youth employment"
  ];
  const [f, setF] = useState({
    dream_career: p.dream_career ?? "",
    industries: Array.isArray(p.industries) ? p.industries : [],
    causes: Array.isArray(p.causes) ? p.causes : [],
    future_vision: p.future_vision ?? "",
  });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      await onSave({
        dream_career: f.dream_career,
        industries: f.industries,
        causes: f.causes,
        future_vision: f.future_vision,
      });
      toast.success(t("prof_aspir_save_success"));
      if (typeof onClose === "function") onClose();
    } catch (err) {
      toast.error(t("prof_aspir_save_error"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="p-6 border-border/50 bg-gradient-card space-y-6">
      <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" />{t("prof_tab_aspirations")}</h3>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />Carrière de rêve</div>
        <Field label={t("prof_aspir_dream")}><Input value={f.dream_career} onChange={(e) => setF({ ...f, dream_career: e.target.value })} /></Field>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{t("prof_aspir_industries")}</div>
        <div className="flex flex-wrap gap-2 p-3 border border-border/50 rounded-xl min-h-[48px] bg-background/50">
          {industryOptions.map((opt: string) => {
            const selected = (f.industries as string[]).includes(opt);
            return (
              <button key={opt} type="button"
                onClick={() => {
                  const current = f.industries as string[];
                  setF({ ...f, industries: selected ? current.filter(c => c !== opt) : [...current, opt] });
                }}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"}`}
              >{opt}</button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{t("prof_aspir_causes")}</div>
        <div className="flex flex-wrap gap-2 p-3 border border-border/50 rounded-xl min-h-[48px] bg-background/50">
          {causeOptions.map((opt: string) => {
            const selected = (f.causes as string[]).includes(opt);
            return (
              <button key={opt} type="button"
                onClick={() => {
                  const current = f.causes as string[];
                  setF({ ...f, causes: selected ? current.filter(c => c !== opt) : [...current, opt] });
                }}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"}`}
              >{opt}</button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Vision</div>
        <Field label={t("prof_aspir_vision")}><Textarea rows={3} value={f.future_vision} onChange={(e) => setF({ ...f, future_vision: e.target.value })} /></Field>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={typeof onClose === "function" ? onClose : undefined}>{t("prof_aspir_cancel")}</Button>
        <Button onClick={submit} className="bg-gradient-hero border-0 shadow-glow" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {t("prof_save")}
        </Button>
      </div>
    </Card>
  );
}

/* SOCIAL + CV */
function SocialLinksForm({ p, t, lang, onSave, onClose }: any) {
  const links = (p.social_links as any) || {};
  const [f, setF] = useState({
    linkedin: links.linkedin ?? "",
    github: links.github ?? "",
    behance: links.behance ?? "",
    website: links.website ?? "",
    video: p.video_intro_url ?? "",
    doc_url: p.cvUrl ?? "",
  });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      await onSave({
        social_links: { linkedin: f.linkedin, github: f.github, behance: f.behance, website: f.website },
        video_intro_url: f.video,
        cvUrl: f.doc_url,
      });
      toast.success(t("prof_saved"));
      if (typeof onClose === "function") onClose();
    } catch (err: any) {
      toast.error(err.message || t("prof_aspir_save_error"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="p-6 border-border/50 bg-gradient-card space-y-5">
      <h3 className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />{t("prof_port_links")}</h3>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Réseaux sociaux</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("prof_port_linkedin")}>
            <div className="relative flex items-center">
              <Linkedin className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} className="pl-9" placeholder="linkedin.com/in/…" />
            </div>
          </Field>
          <Field label={t("prof_port_github")}>
            <div className="relative flex items-center">
              <Github className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input value={f.github} onChange={(e) => setF({ ...f, github: e.target.value })} className="pl-9" placeholder="github.com/…" />
            </div>
          </Field>
          <Field label={t("prof_port_behance")}>
            <div className="relative flex items-center">
              <Link2 className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input value={f.behance} onChange={(e) => setF({ ...f, behance: e.target.value })} className="pl-9" placeholder="behance.net/…" />
            </div>
          </Field>
          <Field label={t("prof_port_website")}>
            <div className="relative flex items-center">
              <Globe className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className="pl-9" placeholder="https://monsite.com" />
            </div>
          </Field>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Médias & Documents</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("prof_port_video")}>
            <div className="relative flex items-center">
              <Link2 className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input value={f.video} onChange={(e) => setF({ ...f, video: e.target.value })} className="pl-9" placeholder="https://youtu.be/…" />
            </div>
          </Field>
          <Field label={lang === "fr" ? "Lien vers tes documents" : "Link to your documents"}>
            <div className="relative flex items-center">
              <FileText className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={f.doc_url}
                onChange={(e) => setF({ ...f, doc_url: e.target.value })}
                className="pl-9"
                placeholder="https://drive.google.com/…"
              />
            </div>
            {f.doc_url && (
              <a href={f.doc_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline flex items-center gap-1 mt-1">
                <FileText className="h-3 w-3" />{lang === "fr" ? "Voir le document" : "View document"}
              </a>
            )}
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => typeof onClose === "function" && onClose()} disabled={loading}>{t("prof_cancel")}</Button>
        <Button onClick={submit} className="bg-gradient-hero border-0 shadow-glow" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {t("prof_save")}
        </Button>
      </div>
    </Card>
  );
}

const kindBadgeColor = (k?: string) => {
  switch (k) {
    case "publication": return "bg-accent/10 text-accent border-accent/20";
    case "research": return "bg-success/10 text-success border-success/20";
    case "impact": return "bg-primary/10 text-primary border-primary/20";
    default: return "bg-muted text-muted-foreground border-border/50";
  }
};

/* PORTFOLIO */
function PortfolioSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Port>({ title: "", kind: "project" });
  const submit = async () => {
    if (!f.title?.trim()) return toast.error(t("prof_port_item_title") || "Portfolio title required");
    setLoading(true);
    try {
      await profileAPI.addPortfolioItem(userId, { title: f.title.trim(), kind: f.kind, url: f.url || "", description: f.description || "" });
      await awardXp(userId, 15, "added_portfolio");
      setOpen(false);
      setF({ title: "", kind: "project" });
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />{t("prof_port_projects")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-gradient-hero border-0 shadow-glow"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />{t("prof_port_projects")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Field label={t("prof_port_item_title")}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label={t("prof_port_item_kind")}>
                <Select value={f.kind ?? "project"} onValueChange={(v) => setF({ ...f, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["project", "publication", "research", "impact"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("prof_port_item_url")}><Input value={f.url ?? ""} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
              <Field label={t("prof_exp_description")}><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4">
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button>
              <Button onClick={submit} disabled={loading} className="bg-gradient-hero border-0 shadow-glow">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("prof_save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_port_empty")}</p> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((p: Port) => (
            <div key={p.id ?? (p as any)._id} className="rounded-xl border border-border/40 hover:border-primary/30 transition-colors group relative overflow-hidden">
              {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-0" /> : null}
              <div className="relative z-10 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${kindBadgeColor(p.kind)}`}>{p.kind ?? "project"}</Badge>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <EditPortfolioItemDialog item={p} userId={userId} t={t} reload={reload} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const itemId = p.id ?? (p as any)._id; if (!itemId) { toast.error("ID introuvable — rechargez la page"); return; } if (!window.confirm("Supprimer cet item ?")) return; (async () => { try { await profileAPI.deletePortfolioItem(userId, itemId); toast.success(t("prof_deleted") || "Supprimé"); reload(); } catch (err: any) { toast.error(err.message || "Erreur lors de la suppression"); } })(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="font-semibold">{p.title}</div>
                {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                {p.url && <div className="flex items-center gap-1 mt-2 text-xs text-primary"><Link2 className="h-3 w-3" />Voir le projet</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
