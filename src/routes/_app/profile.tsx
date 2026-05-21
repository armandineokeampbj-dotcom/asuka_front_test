import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { callProfileAI } from "@/lib/api";
import { profileAPI, storageAPI } from "@/lib/api-client";
import { toast } from "sonner";
import { computeCompletion } from "@/lib/profile-completion";
import { awardXp, awardBadgeIfMissing, notify } from "@/lib/asuka-actions";
import jsPDF from "jspdf";
import {
  Sparkles, Trophy, Flame, Edit3, Plus, Trash2, GraduationCap, Briefcase,
  Award, Target, Globe, Camera, Download, Brain, ShieldCheck, Eye, Loader2,
  Linkedin, Github, Link2, FileText, MapPin,
} from "lucide-react";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

type Profile = any;
type Edu = { id?: string; degree?: string; field?: string; institution: string; country?: string; startDate?: string; endDate?: string; currentlyStudying?: boolean; description?: string; achievements?: string };
type Cert = { id?: string; name: string; issuer?: string; issueDate?: string; credentialUrl?: string; issue_date?: string; credential_url?: string };
type Exp = { id?: string; role: string; organization?: string; industry?: string; type?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string; teamSize?: number; impact?: string; sector?: string; kind?: string; start_date?: string; end_date?: string; is_current?: boolean; team_size?: number };
type Skill = { id?: string; name: string; category: string; level: number; validations?: any };
type Port = { id?: string; type?: string; title: string; description?: string; url?: string; imageUrl?: string; kind?: string };

function Ring({ value, label }: { value: number; label: string }) {
  const r = 28, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="72" height="72">
          <circle cx="36" cy="36" r={r} stroke="oklch(0.92 0.012 280)" strokeWidth="6" fill="none" />
          <circle cx="36" cy="36" r={r} stroke="url(#gp)" strokeWidth="6" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 36 36)" />
          <defs><linearGradient id="gp" x1="0" x2="1"><stop offset="0%" stopColor="oklch(0.42 0.18 275)" /><stop offset="100%" stopColor="oklch(0.78 0.18 65)" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{value}</div>
      </div>
      <div className="text-[11px] text-muted-foreground text-center max-w-[90px]">{label}</div>
    </div>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
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

  const reload = async () => {
    if (!user?.id) return;
    try {
      const data = await profileAPI.getProfile(user.id);
      setP(data.profile);
      setEducation(data.education ?? []);
      setCerts(data.certifications ?? []);
      setExps(data.experiences ?? []);
      setSkills(data.skills ?? []);
      setPortfolio(data.portfolio ?? []);
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

  // Award milestone badges
  useEffect(() => {
    if (!user || !p) return;
    if (completion.score >= 40) awardBadgeIfMissing(user.id, "profile_starter");
    if (completion.score >= 70) awardBadgeIfMissing(user.id, "opportunity_ready");
    const lead = exps.filter((e) => /lead|manag|chef|fond|founder|dirig/i.test(`${e.role} ${e.description ?? ""}`)).length;
    if (lead >= 3) awardBadgeIfMissing(user.id, "top_emerging_leader");
    if (p?.verifications && Object.values(p.verifications).some(Boolean)) awardBadgeIfMissing(user.id, "verified_talent");
  }, [completion.score, exps.length, p?.id]);

  const scores: any = p?.scores || {};
  const labels: string[] = p?.identity_labels || [];
  const xp = p?.xp ?? 0; const level = p?.level ?? 1; const streak = p?.streak_days ?? 0;
  const xpInLevel = xp % 500; const xpPct = (xpInLevel / 500) * 100;
  const readiness = (p?.readiness as any) || {};
  const insights = (p?.personality_insights as any) || {};

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

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;
    try {
      const { url } = await storageAPI.uploadFile(file);
      await profileAPI.updateProfile(user.id, { avatarUrl: url });
      toast.success("Avatar mis à jour");
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    }
  };

  const uploadCv = async (file: File) => {
    if (!user?.id) return;
    try {
      const { url } = await storageAPI.uploadFile(file);
      await profileAPI.updateProfile(user.id, { cvUrl: url });
      toast.success("CV mis à jour");
      reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    }
  };

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
      toast.success(lang === "fr" ? "Insights IA prêts ✨" : "AI insights ready ✨");
      reload();
    } catch (e: any) {
      toast.error(e.message || "AI error");
    } finally { setAiBusy(false); }
  };

  const generateCv = async () => {
    if (!user || !p) return;
    setCvBusy(true);
    try {
      const profilePayload = { ...p, education, experiences: exps, certifications: certs, skills, portfolio };
      const data = await callProfileAI({ action: "generate_cv", lang, profile: profilePayload });
      const md = String((data as any).markdown || "");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40; const w = doc.internal.pageSize.getWidth() - margin * 2;
      const lines = doc.splitTextToSize(md.replace(/[#*`>_\[\]]/g, ""), w);
      let y = margin;
      doc.setFont("helvetica", "normal").setFontSize(11);
      lines.forEach((ln: string) => {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(ln, margin, y); y += 14;
      });
      doc.save(`CV-${(p.full_name || "asuka").replace(/\s+/g, "_")}.pdf`);
      await awardXp(user.id, 20, "cv_generated");
    } catch (e: any) { toast.error(e.message || "CV error"); } finally { setCvBusy(false); }
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
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p.full_name || user?.email || "A")[0].toUpperCase()}
            </div>
            <label className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition">
              <Camera className="h-5 w-5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{p.preferred_name || p.full_name || user?.email}</h1>
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
            const v = Number(readiness[r.k] ?? 0);
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

      <Tabs defaultValue="overview">
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
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold mb-5">{t("prof_scores")}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              <Ring value={scores.employability ?? 60} label={t("score_employability")} />
              <Ring value={scores.leadership ?? 55} label={t("score_leadership")} />
              <Ring value={scores.digital ?? 65} label={t("score_digital")} />
              <Ring value={scores.communication ?? 60} label={t("score_communication")} />
              <Ring value={scores.entrepreneurship ?? 50} label={t("score_entrepreneurship")} />
              <Ring value={scores.community ?? 55} label={t("score_community")} />
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />{t("prof_ai_insights")}</h3>
                <Button size="sm" onClick={runAi} disabled={aiBusy} className="bg-gradient-hero shadow-glow border-0">
                  {aiBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  {aiBusy ? t("prof_ai_running") : t("prof_ai_run")}
                </Button>
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
                <p className="text-sm text-muted-foreground">
                  {lang === "fr" ? "Lance l'analyse IA pour découvrir tes forces et axes de progression." : "Run AI analysis to discover your strengths and growth areas."}
                </p>
              )}
            </Card>

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
          </div>
        </TabsContent>

        {/* PERSONAL */}
        <TabsContent value="personal" className="mt-6">
          <PersonalForm p={p} t={t} onSave={saveProfile} />
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
          <AspirationsForm p={p} t={t} onSave={saveProfile} />
        </TabsContent>

        {/* PORTFOLIO */}
        <TabsContent value="portfolio" className="mt-6 space-y-4">
          <SocialLinksForm p={p} t={t} lang={lang} onSave={saveProfile} onCv={uploadCv} />
          <PortfolioSection items={portfolio} t={t} userId={user!.id} reload={reload} />
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="mt-6">
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold mb-4">{t("prof_timeline_title")}</h3>
            {xpEvents.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_timeline_empty")}</p> : (
              <ul className="space-y-3">
                {xpEvents.map((e: any) => (
                  <li key={e.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">+{e.amount} XP · <span className="text-muted-foreground font-normal">{e.reason}</span></div>
                      <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* PRIVACY */}
        <TabsContent value="privacy" className="mt-6 space-y-4">
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Eye className="h-4 w-4" />{t("prof_privacy_title")}</h3>
            <div className="space-y-2">
              {[
                { v: "public", l: t("prof_privacy_public") },
                { v: "recruiters", l: t("prof_privacy_recruiters") },
                { v: "private", l: t("prof_privacy_private") },
              ].map((opt) => (
                <label key={opt.v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${p.visibility === opt.v ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" name="vis" checked={p.visibility === opt.v} onChange={() => saveProfile({ visibility: opt.v })} />
                  <span className="text-sm">{opt.l}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4" />{lang === "fr" ? "CV IA" : "AI CV"}</h3>
            <p className="text-sm text-muted-foreground mb-3">{lang === "fr" ? "Génère un CV professionnel basé sur ton profil." : "Generate a professional CV from your profile."}</p>
            <Button onClick={generateCv} disabled={cvBusy} className="bg-gradient-hero shadow-glow border-0">
              {cvBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {cvBusy ? t("prof_ai_running") : t("prof_generate_cv")}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --- Sub-forms --- */

function PersonalForm({ p, t, onSave }: any) {
  const [f, setF] = useState({
    preferred_name: p.preferred_name ?? "",
    gender: p.gender ?? "",
    date_of_birth: p.date_of_birth ?? "",
    nationality: p.nationality ?? "",
    city: p.city ?? "",
    phone: p.phone ?? "",
    languages_spoken: (p.languages_spoken ?? []).join(", "),
    primary_language: p.primary_language ?? "",
    willing_to_relocate: !!p.willing_to_relocate,
    remote_available: p.remote_available ?? true,
    bio: p.bio ?? "",
  });
  const update = (k: string, v: any) => setF({ ...f, [k]: v });
  const submit = () => onSave({
    ...f,
    languages_spoken: String(f.languages_spoken).split(",").map((s) => s.trim()).filter(Boolean),
  });
  return (
    <Card className="p-6 border-border/50 space-y-4">
      <h3 className="font-semibold">{t("prof_personal_info")}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("prof_preferred_name")}><Input value={f.preferred_name} onChange={(e) => update("preferred_name", e.target.value)} /></Field>
        <Field label={t("prof_gender")}><Input value={f.gender} onChange={(e) => update("gender", e.target.value)} /></Field>
        <Field label={t("prof_dob")}><Input type="date" value={f.date_of_birth || ""} onChange={(e) => update("date_of_birth", e.target.value)} /></Field>
        <Field label={t("prof_nationality")}><Input value={f.nationality} onChange={(e) => update("nationality", e.target.value)} /></Field>
        <Field label={t("prof_city")}><Input value={f.city} onChange={(e) => update("city", e.target.value)} /></Field>
        <Field label={t("prof_phone")}><Input value={f.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
        <Field label={t("prof_primary_lang")}><Input value={f.primary_language} onChange={(e) => update("primary_language", e.target.value)} placeholder="Français / English" /></Field>
        <Field label={t("prof_languages")}><Input value={f.languages_spoken} onChange={(e) => update("languages_spoken", e.target.value)} placeholder="Français, English, Wolof" /></Field>
      </div>
      <Field label={t("prof_bio")}><Textarea rows={3} value={f.bio} onChange={(e) => update("bio", e.target.value)} /></Field>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.willing_to_relocate} onCheckedChange={(v) => update("willing_to_relocate", v)} />{t("prof_relocate")}</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.remote_available} onCheckedChange={(v) => update("remote_available", v)} />{t("prof_remote")}</label>
      </div>
      <Button onClick={submit} className="bg-gradient-hero border-0 shadow-glow">{t("prof_save")}</Button>
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
            <li key={e.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
              <div>
                <div className="font-medium">{e.degree || "—"} · {e.field}</div>
                <div className="text-sm text-muted-foreground">{e.institution}{e.country ? `, ${e.country}` : ""}</div>
                <div className="text-xs text-muted-foreground mt-1">{e.startDate ?? ""} → {e.currentlyStudying ? "now" : (e.endDate ?? "")}</div>
                {e.description && <p className="text-sm mt-1">{e.description}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={async () => { 
                if (e.id) { 
                  try {
                    await profileAPI.deleteEducation(userId, e.id);
                    reload();
                  } catch (err: any) {
                    toast.error(err.message || "Erreur lors de la suppression");
                  }
                }
              }}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EduDialog({ userId, t, reload }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Edu>({ institution: "", degree: "", field: "", country: "", currentlyStudying: false });
  const submit = async () => {
    if (!f.institution) return toast.error("Institution required");
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
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("prof_tab_education")}</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("prof_edu_degree")}><Input value={f.degree ?? ""} onChange={(e) => setF({ ...f, degree: e.target.value })} /></Field>
          <Field label={t("prof_edu_field")}><Input value={f.field ?? ""} onChange={(e) => setF({ ...f, field: e.target.value })} /></Field>
          <Field label={t("prof_edu_institution")}><Input value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></Field>
          <Field label={t("prof_edu_country")}><Input value={f.country ?? ""} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
          <Field label={t("prof_edu_start")}><Input type="date" value={f.startDate ?? ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label={t("prof_edu_end")}><Input type="date" value={f.endDate ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} disabled={f.currentlyStudying} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.currentlyStudying} onCheckedChange={(v) => setF({ ...f, currentlyStudying: v })} />{t("prof_edu_current")}</label>
        <Field label={t("prof_edu_achievements")}><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button><Button onClick={submit}>{t("prof_save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* CERTIFICATIONS */
function CertificationsSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Cert>({ name: "" });
  const submit = async () => {
    if (!f.name) return;
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
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Award className="h-4 w-4" />{t("prof_cert_section")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("prof_cert_section")}</DialogTitle></DialogHeader>
            <Field label={t("prof_cert_name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={t("prof_cert_issuer")}><Input value={f.issuer ?? ""} onChange={(e) => setF({ ...f, issuer: e.target.value })} /></Field>
            <Field label={t("prof_cert_date")}><Input type="date" value={f.issueDate ?? f.issue_date ?? ""} onChange={(e) => setF({ ...f, issueDate: e.target.value })} /></Field>
            <Field label={t("prof_cert_url")}><Input value={f.credentialUrl ?? f.credential_url ?? ""} onChange={(e) => setF({ ...f, credentialUrl: e.target.value })} /></Field>
            <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button><Button onClick={submit}>{t("prof_save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_cert_empty")}</p> : (
        <ul className="space-y-2">
          {items.map((c: Cert) => (
            <li key={c.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/40">
              <div>
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.issuer} · {c.issueDate ?? c.issue_date}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={async () => { if (c.id) { await profileAPI.deleteCertification(userId, c.id); reload(); } }}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* EXPERIENCE */
function ExperienceSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Exp>({ role: "", kind: "job", isCurrent: false });
  const kinds = ["job", "intern", "volunteer", "freelance", "entre", "community"];
  const kindLabel = (k: string) => t(`prof_exp_kind_${k}` as any);
  const submit = async () => {
    if (!f.role) return;
    try {
      await profileAPI.addExperience(userId, { ...f, user_id: userId });
      await awardXp(userId, 15, "added_experience");
      setOpen(false); setF({ role: "", kind: "job" }); reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4" />{t("prof_tab_experience")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("prof_tab_experience")}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t("prof_exp_role")}><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
              <Field label={t("prof_exp_org")}><Input value={f.organization ?? ""} onChange={(e) => setF({ ...f, organization: e.target.value })} /></Field>
              <Field label={t("prof_exp_sector")}><Input value={f.sector ?? ""} onChange={(e) => setF({ ...f, sector: e.target.value })} /></Field>
              <Field label={t("prof_exp_kind")}>
                <Select value={f.kind ?? "job"} onValueChange={(v) => setF({ ...f, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{kinds.map((k) => <SelectItem key={k} value={k}>{kindLabel(k)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("prof_edu_start")}><Input type="date" value={f.startDate ?? f.start_date ?? ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
              <Field label={t("prof_edu_end")}><Input type="date" value={f.endDate ?? f.end_date ?? ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} disabled={f.isCurrent ?? f.is_current} /></Field>
              <Field label={t("prof_exp_team")}><Input type="number" value={f.teamSize ?? f.team_size ?? ""} onChange={(e) => setF({ ...f, teamSize: parseInt(e.target.value) || undefined })} /></Field>
            </div>
            <Field label={t("prof_exp_description")}><Textarea rows={3} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <Field label={t("prof_exp_impact")}><Input value={f.impact ?? ""} onChange={(e) => setF({ ...f, impact: e.target.value })} /></Field>
            <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button><Button onClick={submit}>{t("prof_save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_exp_empty")}</p> : (
        <ul className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
          {items.map((e: Exp) => (
            <li key={e.id} className="pl-7 relative">
              <span className="absolute left-1 top-2 h-2 w-2 rounded-full bg-primary" />
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-medium">{e.role} <span className="text-muted-foreground font-normal">@ {e.organization}</span></div>
                  <div className="text-xs text-muted-foreground">{kindLabel(e.kind ?? "job")} · {e.startDate ?? ""} → {e.isCurrent ? "now" : (e.endDate ?? "")}</div>
                  {e.description && <p className="text-sm mt-1">{e.description}</p>}
                  {e.impact && <p className="text-xs text-accent mt-1">📈 {e.impact}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { if (e.id) { await profileAPI.deleteExperience(userId, e.id); reload(); } }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* SKILLS */
function SkillsSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Skill>({ name: "", category: "digital", level: 2 });
  const cats = ["digital", "ai", "communication", "leadership", "entrepreneurship", "technical", "creative", "community", "language", "research", "pm"];
  const grouped = useMemo(() => {
    const g: Record<string, Skill[]> = {};
    items.forEach((s: Skill) => { (g[s.category] ||= []).push(s); });
    return g;
  }, [items]);
  const submit = async () => {
    if (!f.name) return;
    try {
      await profileAPI.addSkill(userId, { ...f, user_id: userId });
      await awardXp(userId, 10, "added_skill");
      setOpen(false); setF({ name: "", category: "digital", level: 2 }); reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" />{t("prof_tab_skills")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("prof_tab_skills")}</DialogTitle></DialogHeader>
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
            <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button><Button onClick={submit}>{t("prof_save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_skill_empty")}</p> : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t(`prof_skill_cat_${cat}` as any)}</div>
              <div className="flex flex-wrap gap-2">
                {(list as Skill[]).map((s) => {
                  const v = ((s.validations as any)?.peer ?? 0) + ((s.validations as any)?.mentor ?? 0) + ((s.validations as any)?.org ?? 0);
                  return (
                    <div key={s.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm border">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">· {t(`prof_skill_lvl_${s.level}` as any)}</span>
                      {v > 0 && <span className="text-xs text-success">✓ {v}</span>}
                      <button onClick={async () => { if (s.id) { await profileAPI.deleteSkill(userId, s.id); reload(); } }} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
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

/* ASPIRATIONS */
function AspirationsForm({ p, t, onSave }: any) {
  const [f, setF] = useState({
    dream_career: p.dream_career ?? "",
    industries: (p.industries ?? []).join(", "),
    causes: (p.causes ?? []).join(", "),
    future_vision: p.future_vision ?? "",
  });
  const submit = () => onSave({
    dream_career: f.dream_career,
    industries: f.industries.split(",").map((s: string) => s.trim()).filter(Boolean),
    causes: f.causes.split(",").map((s: string) => s.trim()).filter(Boolean),
    future_vision: f.future_vision,
  });
  return (
    <Card className="p-6 border-border/50 space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" />{t("prof_tab_aspirations")}</h3>
      <Field label={t("prof_aspir_dream")}><Input value={f.dream_career} onChange={(e) => setF({ ...f, dream_career: e.target.value })} /></Field>
      <Field label={t("prof_aspir_industries")}><Input value={f.industries} onChange={(e) => setF({ ...f, industries: e.target.value })} placeholder="Tech, Education, Healthcare" /></Field>
      <Field label={t("prof_aspir_causes")}><Input value={f.causes} onChange={(e) => setF({ ...f, causes: e.target.value })} placeholder="Climate, Gender equality, Education" /></Field>
      <Field label={t("prof_aspir_vision")}><Textarea rows={3} value={f.future_vision} onChange={(e) => setF({ ...f, future_vision: e.target.value })} /></Field>
      <Button onClick={submit} className="bg-gradient-hero border-0 shadow-glow">{t("prof_save")}</Button>
    </Card>
  );
}

/* SOCIAL + CV */
function SocialLinksForm({ p, t, lang, onSave, onCv }: any) {
  const links = (p.social_links as any) || {};
  const [f, setF] = useState({
    linkedin: links.linkedin ?? "",
    github: links.github ?? "",
    behance: links.behance ?? "",
    website: links.website ?? "",
    video: p.video_intro_url ?? "",
  });
  const submit = () => onSave({
    social_links: { linkedin: f.linkedin, github: f.github, behance: f.behance, website: f.website },
    video_intro_url: f.video,
  });
  return (
    <Card className="p-6 border-border/50 space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" />{t("prof_port_links")}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("prof_port_linkedin")}><div className="flex items-center gap-2"><Linkedin className="h-4 w-4 text-muted-foreground" /><Input value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} /></div></Field>
        <Field label={t("prof_port_github")}><div className="flex items-center gap-2"><Github className="h-4 w-4 text-muted-foreground" /><Input value={f.github} onChange={(e) => setF({ ...f, github: e.target.value })} /></div></Field>
        <Field label={t("prof_port_behance")}><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-muted-foreground" /><Input value={f.behance} onChange={(e) => setF({ ...f, behance: e.target.value })} /></div></Field>
        <Field label={t("prof_port_website")}><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-muted-foreground" /><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></div></Field>
        <Field label={t("prof_port_video")}><Input value={f.video} onChange={(e) => setF({ ...f, video: e.target.value })} placeholder="https://youtu.be/…" /></Field>
        <Field label={t("prof_port_cv")}>
          <div className="flex items-center gap-2">
            <Input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && onCv(e.target.files[0])} />
            {p.cv_url && <a href={p.cv_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline whitespace-nowrap">{lang === "fr" ? "Voir" : "View"}</a>}
          </div>
        </Field>
      </div>
      <Button onClick={submit} className="bg-gradient-hero border-0 shadow-glow">{t("prof_save")}</Button>
    </Card>
  );
}

/* PORTFOLIO */
function PortfolioSection({ items, t, userId, reload }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Port>({ title: "", kind: "project" });
  const submit = async () => {
    if (!f.title) return;
    try {
      await profileAPI.addPortfolioItem(userId, { ...f, user_id: userId });
      await awardXp(userId, 15, "added_portfolio");
      setOpen(false); setF({ title: "", kind: "project" }); reload();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    }
  };
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{t("prof_port_projects")}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("prof_add")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("prof_port_projects")}</DialogTitle></DialogHeader>
            <Field label={t("prof_port_item_title")}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label={t("prof_port_item_kind")}>
              <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["project", "publication", "research", "impact"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("prof_port_item_url")}><Input value={f.url ?? ""} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
            <Field label={t("prof_exp_description")}><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{t("prof_cancel")}</Button><Button onClick={submit}>{t("prof_save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("prof_port_empty")}</p> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((p: Port) => (
            <a key={p.id} href={p.url || "#"} target="_blank" rel="noreferrer" className="block p-4 rounded-lg border border-border/40 hover:border-primary/40 transition">
              <div className="text-xs uppercase text-muted-foreground">{p.kind}</div>
              <div className="font-semibold mt-1">{p.title}</div>
              {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
