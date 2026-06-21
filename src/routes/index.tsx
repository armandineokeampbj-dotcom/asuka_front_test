import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/asuka/PublicHeader";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Briefcase, Radio, UserCircle2, ArrowRight, Star, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Fragment, useEffect, useRef, useState } from "react";
import { profileAPI } from "@/lib/api-client";
import { generateAICoachContent, type UserProfile } from "@/lib/asuka-actions";
import { computeCompletion } from "@/lib/profile-completion";
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
  const { user } = useAuth();
  const [aiCoachContent, setAiCoachContent] = useState<{ advice: string; recommendation: string; scoreTarget: number }>({
    advice: "",
    recommendation: "",
    scoreTarget: 86,
  });
  const [profileScore, setProfileScore] = useState(0);
  const [promoIdx, setPromoIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const heroCardRef = useRef<HTMLDivElement>(null);
  const heroGlareRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const [metricsVisible, setMetricsVisible] = useState(false);
  const [metricCounts, setMetricCounts] = useState([0, 0, 0, 0]);

  const METRIC_TARGETS = [1, 50, 3, 86];

  useEffect(() => {
    const el = metricsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setMetricsVisible(true);
        const duration = 2000;
        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = now - start;
          const p = Math.min(elapsed / duration, 1);
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          setMetricCounts(METRIC_TARGETS.map((max) => Math.round(eased * max)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = heroCardRef.current;
    const glare = heroGlareRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    card.style.transform = `perspective(900px) rotateX(${dy * -12}deg) rotateY(${dx * 12}deg) scale(1.04)`;
    card.style.transition = "transform 0.08s ease-out";
    if (glare) {
      const gx = ((e.clientX - rect.left) / rect.width) * 100;
      const gy = ((e.clientY - rect.top) / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.18) 0%, transparent 60%)`;
      glare.style.opacity = "1";
    }
  };

  const handleHeroMouseLeave = () => {
    const card = heroCardRef.current;
    const glare = heroGlareRef.current;
    if (card) {
      card.style.transform = "";
      card.style.transition = "transform 0.7s ease-out";
    }
    if (glare) glare.style.opacity = "0";
  };

  // Fetch user profile and generate personalized AI Coach content
  useEffect(() => {
    const loadAICoachContent = async () => {
      try {
        if (user) {
          const profile = await profileAPI.getProfile(user.id);
          const content = generateAICoachContent(profile as Partial<UserProfile>, lang as "en" | "fr");
          setAiCoachContent(content);
          const { score } = computeCompletion({
            profile: profile as any,
            educationCount: (profile as any)?.education?.length ?? 0,
            experienceCount: (profile as any)?.experiences?.length ?? 0,
            skillsCount: (profile as any)?.skills?.length ?? 0,
            certificationsCount: (profile as any)?.certifications?.length ?? 0,
            portfolioCount: (profile as any)?.portfolio?.length ?? 0,
          });
          setProfileScore(score);
        }
      } catch {
        // silent — promo carousel shown when no profile
      }
    };
    loadAICoachContent();
  }, [user, lang]);

  // Carousel rotation every 15s when not logged in
  useEffect(() => {
    if (user) return;
    const PROMO_COUNT = 5;
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPromoIdx((i) => (i + 1) % PROMO_COUNT);
        setFade(true);
      }, 350);
    }, 15000);
    return () => clearInterval(timer);
  }, [user]);
  return (
    <>
      <PublicHeader />
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-aurora" />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-foreground/80 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              {t("hero_badge")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15]">
              {t("tagline").split(" ").map((word, i, arr) => (
                <Fragment key={i}>
                  <span
                    className="hero-title-word inline-block"
                    style={{
                      animation: [
                        `hero-word-in 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1 + 0.1}s both`,
                        `hero-title-flow 4s ease-in-out ${i * 0.15 + 1.8}s infinite`,
                      ].join(", "),
                    }}
                  >
                    {word}
                  </span>
                  {i < arr.length - 1 && " "}
                </Fragment>
              ))}
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
          <div className="relative mx-auto w-full max-w-2xl flex items-center justify-center">
            {/* Glow halo derrière la card */}
            <div className="absolute inset-[-10%] bg-gradient-aurora blur-3xl opacity-60 pointer-events-none" />

            {/* Card 3D — tilt souris + flottement auto */}
            <div
              ref={heroCardRef}
              onMouseMove={handleHeroMouseMove}
              onMouseLeave={handleHeroMouseLeave}
              className="hero-float relative w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ transformStyle: "preserve-3d", willChange: "transform" }}
            >
              {/* Reflet lumineux dynamique */}
              <div
                ref={heroGlareRef}
                className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
                style={{ opacity: 0, transition: "opacity 0.3s ease" }}
              />
              {/* Bordure subtile */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 z-20 pointer-events-none" />

              <img
                src={heroIllustration}
                alt="Hero illustration"
                className="w-full h-auto object-cover block -mt-[8%]"
                draggable={false}
              />
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div ref={metricsRef} className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { fmt: (n: number) => `${n}K+`, label: t("metric_youth") },
            { fmt: (n: number) => `${n}+`,  label: t("metric_opps") },
            { fmt: (n: number) => `${n}`,   label: t("metric_countries") },
            { fmt: (n: number) => `${n}%`,  label: t("metric_match") },
          ].map((m, i) => (
            <Card
              key={m.label}
              className="p-4 glass border-border/50 text-center"
              style={
                metricsVisible
                  ? { animation: `metric-card-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.13}s both` }
                  : { opacity: 0 }
              }
            >
              <div className="text-2xl sm:text-3xl font-bold text-gradient tabular-nums">
                {m.fmt(metricCounts[i])}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
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
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary mb-3">
                <Zap className="h-3.5 w-3.5" /> ASUKA COACH
              </div>
              {user ? (
                <p className="text-xl sm:text-2xl font-semibold leading-snug">
                  « {aiCoachContent.advice} {aiCoachContent.recommendation} {t("metric_match")} {aiCoachContent.scoreTarget}%. »
                </p>
              ) : (
                <p
                  className="text-xl sm:text-2xl font-semibold leading-snug transition-opacity duration-300"
                  style={{ opacity: fade ? 1 : 0 }}
                >
                  « {[
                    t("coach_promo_1"),
                    t("coach_promo_2"),
                    t("coach_promo_3"),
                    t("coach_promo_4"),
                    t("coach_promo_5"),
                  ][promoIdx]} »
                </p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => {
                    const filled = user ? i <= Math.round(profileScore / 20) : false;
                    return (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${filled ? "fill-accent text-accent" : "text-border"}`}
                      />
                    );
                  })}
                </div>
                {!user && (
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <button
                        key={i}
                        onClick={() => { setPromoIdx(i); setFade(true); }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === promoIdx ? "w-4 bg-primary" : "w-1.5 bg-border"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button asChild size="lg" className="bg-gradient-hero shadow-glow border-0 shrink-0">
              <Link to={user ? "/coach" : "/auth"} search={user ? undefined : { mode: "signup" }}>
                {user ? t("nav_coach") : t("nav_get_started")}
              </Link>
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
    </>
  );
}
