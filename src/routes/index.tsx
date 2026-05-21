import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/asuka/PublicHeader";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Briefcase, Radio, UserCircle2, ArrowRight, Star, Zap } from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Asuka One — Transforme ton potentiel en opportunités" },
      { name: "description", content: "Coaching IA, opportunités intelligentes et identité de potentiel pour la jeunesse africaine." },
    ],
  }),
});

function Landing() {
  const { t, lang } = useLang();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-aurora" />
      <PublicHeader />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-foreground/80 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              {t("hero_badge")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
              <span className="text-gradient">{t("tagline")}</span>
            </h1>
            <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-muted-foreground">
              {t("subtagline")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center lg:justify-start">
              <Button asChild size="lg" className="bg-gradient-hero shadow-glow border-0 text-base h-12 px-8">
                <Link to="/auth" search={{ mode: "signup" }}>{t("hero_cta_primary")} <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base h-12 px-8">
                <Link to="/opportunities">{t("hero_cta_secondary")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto max-w-lg">
            <div className="absolute inset-0 bg-gradient-aurora blur-3xl opacity-70" />
            <div className="w-full h-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl overflow-hidden p-8 min-h-96">
              <img 
                src={heroIllustration} 
                alt="Hero illustration" 
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { v: "120K+", l: t("metric_youth") },
            { v: "4.5K+", l: t("metric_opps") },
            { v: "32", l: t("metric_countries") },
            { v: "87%", l: t("metric_match") },
          ].map((m) => (
            <Card key={m.l} className="p-4 glass border-border/50 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gradient">{m.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.l}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-5xl font-bold">{t("features_title")}</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{t("features_subtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { icon: Sparkles, title: t("feature_coach_title"), desc: t("feature_coach_desc"), tone: "from-primary to-primary-glow" },
            { icon: UserCircle2, title: t("feature_id_title"), desc: t("feature_id_desc"), tone: "from-accent to-primary-glow" },
            { icon: Briefcase, title: t("feature_opps_title"), desc: t("feature_opps_desc"), tone: "from-primary-glow to-accent" },
            { icon: Radio, title: t("feature_pulse_title"), desc: t("feature_pulse_desc"), tone: "from-primary to-accent" },
          ].map((f) => {
            const I = f.icon;
            return (
              <Card key={f.title} className="group relative overflow-hidden p-8 border-border/50 hover:shadow-glow transition-all duration-500">
                <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${f.tone} opacity-20 blur-3xl group-hover:opacity-40 transition`} />
                <div className="relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-soft mb-4">
                    <I className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* AI COACH PREVIEW */}
      <section className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
        <Card className="relative overflow-hidden p-6 sm:p-10 border-border/50 bg-gradient-card">
          <div className="absolute inset-0 bg-gradient-aurora opacity-60" />
          <div className="relative grid sm:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary mb-2">
                <Zap className="h-3.5 w-3.5" /> AI Coach
              </div>
              <p className="text-xl sm:text-2xl font-semibold leading-snug">
                {lang === "fr"
                  ? "« D'après ton profil, postule à 3 opportunités cette semaine et complète ta certification IA pour passer à un score d'employabilité de 86. »"
                  : "“Based on your profile, apply to 3 opportunities this week and finish your AI certification to push your employability score to 86.”"}
              </p>
              <div className="mt-4 flex gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}
              </div>
            </div>
            <Button asChild size="lg" className="bg-gradient-hero shadow-glow border-0">
              <Link to="/auth" search={{ mode: "signup" }}>{t("nav_get_started")}</Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold">{t("cta_final_title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("cta_final_sub")}</p>
        <Button asChild size="lg" className="mt-8 bg-gradient-hero shadow-glow border-0 text-base h-12 px-8">
          <Link to="/auth" search={{ mode: "signup" }}>{t("hero_cta_primary")} <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Asuka One — Make potential visible.
      </footer>
    </div>
  );
}
