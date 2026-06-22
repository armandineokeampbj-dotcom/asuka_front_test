import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/components/asuka/LanguageSwitcher";
import { ThemeToggle } from "@/components/asuka/ThemeToggle";
import { Logo } from "@/components/asuka/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  User, Mail, Phone, MapPin, GraduationCap, Briefcase,
  Award, Globe, Github, Linkedin, Link2, Copy, Check,
  Layers, ExternalLink, Languages, Target, Heart,
  CheckCircle2, Wifi, MapPinned, Sparkles, Flag,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$slug")({ component: PublicProfilePage });

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface PublicProfile {
  firstName: string;
  lastName: string;
  preferred_name: string | null;
  avatarUrl: string | null;
  bio: string;
  email: string | null;
  phone: string | null;
  dream_career: string | null;
  current_status: string | null;
  city: string | null;
  country: string | null;
  nationality: string | null;
  languages_spoken: string[];
  identity_labels: string[];
  industries: string[];
  causes: string[];
  goals: string[];
  interests: string[];
  future_vision: string | null;
  willing_to_relocate: boolean;
  remote_available: boolean;
  social_links: { linkedin?: string; github?: string; behance?: string; website?: string };
  skills: { name: string; level: number; category: string }[];
  education: { degree: string; field: string; school: string; country: string | null; startDate: string | null; endDate: string | null; currentlyStudying: boolean }[];
  certifications: { title: string; issuer: string; issueDate: string | null }[];
  experiences: { title: string; company: string; location: string; startDate: string | null; endDate: string | null; currentlyWorking: boolean; description: string }[];
  portfolio: { title: string; description: string; url: string; tags: string[] }[];
}

// Language codes → localized display names (AU official languages)
const LANG_NAMES: Record<string, Record<string, string>> = {
  ar: { en: "Arabic",     fr: "Arabe",     pt: "Árabe",    ar: "العربية",    es: "Árabe",    sw: "Kiarabu" },
  en: { en: "English",    fr: "Anglais",   pt: "Inglês",   ar: "الإنجليزية", es: "Inglés",   sw: "Kiingereza" },
  fr: { en: "French",     fr: "Français",  pt: "Francês",  ar: "الفرنسية",   es: "Francés",  sw: "Kifaransa" },
  pt: { en: "Portuguese", fr: "Portugais", pt: "Português",ar: "البرتغالية", es: "Portugués",sw: "Kireno" },
  sw: { en: "Swahili",    fr: "Swahili",   pt: "Suaíli",   ar: "السواحيلية", es: "Suajili",  sw: "Kiswahili" },
};

function getLangName(code: string, visitorLang: string): string {
  return LANG_NAMES[code]?.[visitorLang] || LANG_NAMES[code]?.["en"] || code;
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function LevelBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 mt-0.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < level ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
  );
}

function hasAnyLink(sl: PublicProfile["social_links"]): boolean {
  return !!(sl?.linkedin || sl?.github || sl?.behance || sl?.website);
}

function detectPlatform(url: string): { label: string; Icon: React.ElementType } {
  try {
    const href = url.startsWith("http") ? url : `https://${url}`;
    const host = new URL(href).hostname.replace(/^www\./, "");
    if (host.includes("linkedin.com"))                              return { label: "LinkedIn",  Icon: Linkedin };
    if (host.includes("github.com"))                               return { label: "GitHub",    Icon: Github };
    if (host.includes("behance.net"))                              return { label: "Behance",   Icon: Link2 };
    if (host.includes("facebook.com") || host.includes("fb.com")) return { label: "Facebook",  Icon: Globe };
    if (host.includes("twitter.com") || host === "x.com")         return { label: "Twitter/X", Icon: Globe };
    if (host.includes("instagram.com"))                            return { label: "Instagram", Icon: Globe };
    if (host.includes("youtube.com"))                              return { label: "YouTube",   Icon: Globe };
    return { label: host, Icon: Globe };
  } catch {
    return { label: url, Icon: Link2 };
  }
}

function SocialLinkItem({ url }: { url: string }) {
  const href = url.startsWith("http") ? url : `https://${url}`;
  const { label, Icon } = detectPlatform(url);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-2.5 rounded-xl border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors truncate flex-1">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary/60 transition-colors" />
    </a>
  );
}

function PublicProfilePage() {
  const { slug } = Route.useParams();
  const { t, lang } = useLang();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/p/${slug}`)
      .then(async (r) => {
        if (r.status === 403) { setIsPrivate(true); return null; }
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProfile(data); })
      .catch(() => setNotFound(true));
  }, [slug]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success(t("pub_link_copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = profile
    ? profile.preferred_name || `${profile.firstName} ${profile.lastName}`
    : "";

  const initials = profile
    ? (profile.preferred_name
        ? profile.preferred_name[0].toUpperCase()
        : `${profile.firstName[0]}${profile.lastName[0]}`)
    : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border/60 header-bg">
        <div className="mx-auto max-w-4xl px-4 py-1 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {isPrivate && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h1 className="text-2xl font-bold">{t("pub_private_title")}</h1>
            <p className="text-muted-foreground max-w-sm">{t("pub_private_desc")}</p>
          </div>
        )}

        {notFound && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
            <User className="h-16 w-16 text-muted-foreground/30" />
            <h1 className="text-2xl font-bold">{t("pub_not_found")}</h1>
            <p className="text-muted-foreground max-w-sm">{t("pub_not_found_desc")}</p>
          </div>
        )}

        {!profile && !notFound && !isPrivate && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Hero card */}
            <Card className="p-6 border-border/50">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover shrink-0 border-2 border-border" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold">{displayName}</h1>
                    {profile.current_status && (
                      <Badge variant="secondary" className="text-xs">
                        {t(`status_${profile.current_status}` as any) || profile.current_status}
                      </Badge>
                    )}
                  </div>
                  {profile.dream_career && <p className="text-primary font-medium mt-0.5">{profile.dream_career}</p>}
                  {profile.bio && <p className="text-muted-foreground text-sm mt-2 line-clamp-3">{profile.bio}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                    {(profile.city || profile.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[profile.city, profile.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {profile.nationality && (
                      <span className="flex items-center gap-1">
                        <Flag className="h-3 w-3" />{profile.nationality}
                      </span>
                    )}
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="h-3 w-3" />{profile.email}
                      </a>
                    )}
                    {profile.phone && (
                      <a href={`tel:${profile.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="h-3 w-3" />{profile.phone}
                      </a>
                    )}
                  </div>
                  {(profile.remote_available || profile.willing_to_relocate) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profile.remote_available && (
                        <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                          <Wifi className="h-3 w-3" />{t("pub_remote_ok")}
                        </span>
                      )}
                      {profile.willing_to_relocate && (
                        <span className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                          <MapPinned className="h-3 w-3" />{t("pub_open_relocate")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 gap-1.5 self-start">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {t("pub_copy_link")}
                </Button>
              </div>

              {/* Identity labels */}
              {profile.identity_labels.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-border/40">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  {profile.identity_labels.map((label, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-primary/30 text-primary">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid lg:grid-cols-[1fr_280px] gap-6">
              {/* Left column */}
              <div className="space-y-6">
                {/* About / Goals / Vision */}
                {(profile.goals.length > 0 || !!profile.future_vision) && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                      <Target className="h-4 w-4 text-primary" />{t("pub_about")}
                    </h2>
                    {profile.future_vision && (
                      <p className="text-sm text-muted-foreground mb-3">{profile.future_vision}</p>
                    )}
                    {profile.goals.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("pub_goals")}</p>
                        <div className="space-y-1.5">
                          {profile.goals.map((g, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                              <span>{g}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Experience */}
                {profile.experiences.length > 0 && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                      <Briefcase className="h-4 w-4 text-primary" />{t("pub_experience")}
                    </h2>
                    <div className="space-y-4">
                      {profile.experiences.map((x, i) => (
                        <div key={i} className="border-l-2 border-primary/30 pl-4">
                          <div className="font-medium">{x.title}</div>
                          <div className="text-sm text-muted-foreground">{x.company}{x.location ? ` · ${x.location}` : ""}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {fmtDate(x.startDate)} → {x.currentlyWorking ? t("pub_currently") : fmtDate(x.endDate)}
                          </div>
                          {x.description && <p className="text-sm mt-1 text-muted-foreground line-clamp-3">{x.description}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Education */}
                {profile.education.length > 0 && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                      <GraduationCap className="h-4 w-4 text-primary" />{t("pub_education")}
                    </h2>
                    <div className="space-y-4">
                      {profile.education.map((e, i) => (
                        <div key={i} className="border-l-2 border-primary/30 pl-4">
                          <div className="font-medium">{e.field || e.degree}</div>
                          <div className="text-sm text-muted-foreground">{e.degree}{e.school ? ` · ${e.school}` : ""}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {fmtDate(e.startDate)} → {e.currentlyStudying ? t("pub_currently") : fmtDate(e.endDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Certifications */}
                {profile.certifications.length > 0 && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                      <Award className="h-4 w-4 text-primary" />{t("pub_certif")}
                    </h2>
                    <div className="space-y-2">
                      {profile.certifications.map((c, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">{c.title}</div>
                            <div className="text-xs text-muted-foreground">{c.issuer}</div>
                          </div>
                          {c.issueDate && <span className="text-xs text-muted-foreground shrink-0">{fmtDate(c.issueDate)}</span>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Portfolio */}
                {profile.portfolio.length > 0 && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                      <Layers className="h-4 w-4 text-primary" />{t("pub_portfolio")}
                    </h2>
                    <div className="space-y-3">
                      {profile.portfolio.map((p, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border/60">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-sm">{p.title}</div>
                            {p.url && (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary shrink-0">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                          {p.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Skills */}
                {profile.skills.length > 0 && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                      <Award className="h-4 w-4 text-primary" />{t("pub_skills")}
                    </h2>
                    <div className="space-y-2.5">
                      {profile.skills.map((s, i) => (
                        <div key={i}>
                          <div className="text-sm font-medium">{s.name}</div>
                          <LevelBar level={s.level} />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Languages */}
                {profile.languages_spoken.length > 0 && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-3">
                      <Languages className="h-4 w-4 text-primary" />{t("pub_languages")}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.languages_spoken.map((code, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getLangName(code, lang)}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Interests & Causes */}
                {(profile.industries.length > 0 || profile.causes.length > 0 || profile.interests.length > 0) && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-3">
                      <Heart className="h-4 w-4 text-primary" />{t("pub_interests")}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {[...profile.industries, ...profile.causes, ...profile.interests].map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Online profiles */}
                {hasAnyLink(profile.social_links) && (
                  <Card className="p-5 border-border/50">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                      <Globe className="h-4 w-4 text-primary" />{t("pub_online")}
                    </h2>
                    <div className="space-y-2">
                      {[profile.social_links.linkedin, profile.social_links.github, profile.social_links.website, profile.social_links.behance]
                        .filter((url): url is string => !!url)
                        .map((url, i) => <SocialLinkItem key={i} url={url} />)
                      }
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
