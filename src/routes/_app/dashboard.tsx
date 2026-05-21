import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { profileAPI, opportunitiesAPI, pulsesAPI } from "@/lib/api-client";
import { Sparkles, Flame, Trophy, ArrowRight, Briefcase, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [profile, setProfile] = useState<any>(null);
  const [opps, setOpps] = useState<any[]>([]);
  const [pulse, setPulse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        // Load profile
        const profileData = await profileAPI.getProfile(user.id);
        if (profileData && !profileData.profile?.onboarded) {
          window.location.replace("/onboarding");
          return;
        }
        setProfile(profileData.profile);

        // Load opportunities
        const oppData = await opportunitiesAPI.getOpportunities();
        setOpps((oppData?.opportunities || []).slice(0, 3));

        // Load pulses
        const pulseData = await pulsesAPI.getPulses();
        if (pulseData?.pulses && pulseData.pulses.length > 0) {
          setPulse(pulseData.pulses[0]);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);
  const name = profile?.firstName?.split(" ")[0] || user?.firstName?.split(" ")[0] || "👋";
  const scores: any = profile?.scores || { employability: 60, leadership: 55, digital: 65 };
  const labels: string[] = profile?.interests || [];
  const completion = profile?.profileCompletion || 30;
  const xp = profile?.totalXP ?? 0;
  const streak = profile?.currentStreak ?? 0;
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-8 border-border/50 bg-gradient-card">
        <div className="absolute inset-0 bg-gradient-aurora opacity-60" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("dash_welcome")}</p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-1">{name} <span className="text-gradient">✨</span></h1>
            <p className="mt-2 text-muted-foreground max-w-xl">{t("dash_subwelcome")}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {labels.map((l) => <Badge key={l} variant="secondary" className="bg-accent/20 text-foreground border-accent/30">{l}</Badge>)}
            </div>
          </div>
          <div className="flex gap-3">
            <Card className="px-4 py-3 border-border/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Flame className="h-3.5 w-3.5 text-accent" />{t("dash_streak")}</div>
              <div className="text-2xl font-bold mt-1">{streak} <span className="text-xs text-muted-foreground font-normal">{t("dash_days")}</span></div>
            </Card>
            <Card className="px-4 py-3 border-border/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Trophy className="h-3.5 w-3.5 text-primary" />{t("dash_xp")}</div>
              <div className="text-2xl font-bold mt-1">{xp.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}</div>
            </Card>
          </div>
        </div>
      </Card>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("dash_progress")}</h3>
            <Link to="/profile" className="text-xs text-primary hover:underline">{t("dash_view_all")}</Link>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gradient">{completion}%</span>
              <span className="text-xs text-muted-foreground">{t("prof_completion")}</span>
            </div>
            <Progress value={completion} className="h-2 mt-2" />
          </div>
          <div className="mt-5 space-y-3">
            {[{k:"employability",l:t("score_employability")},{k:"digital",l:t("score_digital")},{k:"leadership",l:t("score_leadership")}].map((s) => (
              <div key={s.k}>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{s.l}</span><span className="font-medium">{scores[s.k] ?? 60}</span></div>
                <Progress value={scores[s.k] ?? 60} className="h-1.5 mt-1" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="relative overflow-hidden p-6 border-border/50 bg-gradient-hero text-primary-foreground">
          <Sparkles className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
          <div className="relative">
            <div className="text-xs opacity-80">{t("dash_coach_suggestions")}</div>
            <p className="mt-3 text-base leading-snug font-medium">
              {lang === "fr" ? "Postule à « Designer Produit Junior » — ton match est de 94%." : "Apply to “Junior Product Designer” — your match is 94%."}
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-5">
              <Link to="/coach">{t("dash_open_coach")} <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </Card>
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" />{t("dash_pulse_insight")}</div>
          <p className="mt-3 font-medium leading-snug">
            {pulse ? (lang === "fr" ? pulse.question_fr : pulse.question_en) : (lang === "fr" ? "Pulse arrive bientôt." : "Pulse coming soon.")}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5"><Link to="/pulse">Pulse <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </Card>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">{t("dash_recommended")}</h3>
          <Link to="/opportunities" className="text-xs text-primary hover:underline">{t("dash_view_all")}</Link>
        </div>
        {opps.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
            {lang === "fr" ? "Pas encore d'opportunités — l'admin peut en publier." : "No opportunities yet — admins can publish some."}
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {opps.map((o) => (
              <Card key={o.id} className="p-5 border-border/50 hover:shadow-soft transition group">
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{o.emoji ?? "✨"}</div>
                  <Badge variant="outline" className="text-[10px]">{o.type}</Badge>
                </div>
                <div className="mt-3 font-semibold leading-snug">{lang === "fr" ? o.title_fr : o.title_en}</div>
                <div className="text-xs text-muted-foreground mt-1">{o.org_name}{o.location ? ` · ${o.location}` : ""}</div>
                <Button asChild size="sm" variant="ghost" className="mt-3 -ml-2 group-hover:text-primary">
                  <Link to="/opportunities"><Briefcase className="h-3.5 w-3.5 mr-1" /> {t("opp_apply")}</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
