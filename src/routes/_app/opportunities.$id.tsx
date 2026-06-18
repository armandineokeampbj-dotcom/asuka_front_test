import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/context/AuthProvider";
import {
  ArrowLeft,
  Bookmark,
  CalendarClock,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { opportunitiesAPI } from "@/lib/api-client";

export const Route = createFileRoute("/_app/opportunities/$id")({ component: OppDetail });

type Opp = {
  id: string;
  type: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  orgName: string | null;
  location: string | null;
  remote: boolean;
  deadline: string | null;
  emoji: string | null;
  link: string | null;
  skills: string[];
  tags: string[];
  country: string | null;
  languages: string[];
};

function OppDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [opp, setOpp] = useState<Opp | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    // Incrémenter views_count une seule fois par visite (guard contre double-appel StrictMode)
    if (!viewedRef.current) {
      viewedRef.current = true;
      opportunitiesAPI.viewOpportunity(id).catch(() => {});
    }

    opportunitiesAPI
      .getOpportunity(id)
      .then((data: any) => {
        const raw = data?.opportunity ?? data;
        if (!raw) { setNotFound(true); return; }
        setOpp({
          id: raw._id ?? raw.id,
          type: raw.type ?? "",
          titleFr: raw.title_fr ?? raw.title ?? "",
          titleEn: raw.title_en ?? raw.title ?? "",
          descriptionFr: raw.description_fr ?? raw.description ?? null,
          descriptionEn: raw.description_en ?? raw.description ?? null,
          orgName: raw.organization ?? raw.org_name ?? null,
          location: raw.location ?? null,
          remote: raw.remote ?? false,
          deadline: raw.deadline ?? null,
          emoji: raw.emoji ?? null,
          link: raw.link ?? null,
          skills: Array.isArray(raw.skills) ? raw.skills : [],
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          country: raw.country ?? null,
          languages: Array.isArray(raw.languages) ? raw.languages : [],
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const pageUrl = `${window.location.origin}/opportunities/${id}`;
  const title = opp ? (lang === "fr" ? opp.titleFr : opp.titleEn) : "";
  const description = opp ? (lang === "fr" ? opp.descriptionFr : opp.descriptionEn) : null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl).then(() => {
      toast.success(t("opp_link_copied") || "Lien copié !");
    });
  };

  const openShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const shareLinks = opp
    ? [
        {
          label: "X (Twitter)",
          color: "bg-black hover:bg-neutral-800",
          url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`,
          icon: (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ),
        },
        {
          label: "LinkedIn",
          color: "bg-[#0A66C2] hover:bg-[#0958a8]",
          url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
          icon: (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          ),
        },
        {
          label: "WhatsApp",
          color: "bg-[#25D366] hover:bg-[#1ebe5c]",
          url: `https://wa.me/?text=${encodeURIComponent(`${title} — ${pageUrl}`)}`,
          icon: (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          ),
        },
        {
          label: "Facebook",
          color: "bg-[#1877F2] hover:bg-[#1464d0]",
          url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
          icon: (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          ),
        },
      ]
    : [];

  const handleToggleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res: any = await opportunitiesAPI.saveOpportunity(id);
      setIsSaved(res.saved ?? !isSaved);
      toast(res.saved
        ? (t("opp_saved") || "Ajouté aux favoris")
        : (t("opp_unsaved") || "Retiré des favoris")
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLink = () => {
    if (!opp?.link) return;

    // Enregistre la candidature (1 par user, idempotent côté serveur)
    if (!hasApplied) {
      opportunitiesAPI.applyForOpportunity(opp.id).then((res: any) => {
        if (!res?.alreadyApplied) setHasApplied(true);
      }).catch(() => {});
      setHasApplied(true);
    }

    const url = /^https?:\/\//i.test(opp.link) ? opp.link : `https://${opp.link}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (notFound || !opp) {
    return (
      <div className="space-y-4">
        <Link to="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" />
          {t("opp_back") || "Retour aux opportunités"}
        </Link>
        <Card className="p-10 text-center text-muted-foreground border-dashed">
          {t("opp_not_found") || "Opportunité introuvable"}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("opp_back") || "Retour aux opportunités"}
      </Link>

      {/* Header card */}
      <Card className="p-6 border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div className="text-5xl">{opp.emoji ?? "✨"}</div>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={handleToggleSave}
            className={isSaved ? "text-primary border-primary/40" : ""}
            title={isSaved ? t("opp_unsaved") : t("opp_saved")}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            )}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{title || "—"}</h1>
          {opp.orgName && (
            <p className="text-base text-muted-foreground font-medium">{opp.orgName}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {opp.type && <Badge variant="outline">{opp.type}</Badge>}
            {opp.remote && <Badge variant="outline">Remote</Badge>}
            {opp.country && <Badge variant="outline">{opp.country}</Badge>}
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            {opp.location && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {opp.location}
                {opp.remote ? " · Remote" : ""}
              </div>
            )}
            {opp.deadline && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 shrink-0" />
                {t("admin_opp_detail_deadline") || "Deadline :"} {opp.deadline}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 space-y-2">
          <Button
            className="w-full bg-gradient-hero border-0"
            disabled={!opp.link}
            onClick={handleOpenLink}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("opp_consult_apply") || "Consulter et Postuler"}
          </Button>
          {hasApplied && (
            <p className="text-center text-xs text-muted-foreground">
              ✓ {t("opp_applied") || "Candidature enregistrée"}
            </p>
          )}
        </div>
      </Card>

      {/* Description */}
      {description && (
        <Card className="p-6 border-border/50 space-y-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Description</h2>
          <p className="text-sm leading-relaxed">{description}</p>
        </Card>
      )}

      {/* Skills & Tags */}
      {(opp.skills.length > 0 || opp.tags.length > 0) && (
        <Card className="p-6 border-border/50 space-y-3">
          {opp.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {opp.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Share */}
      <Card className="p-6 border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">{t("opp_share") || "Partager"}</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {shareLinks.map(({ label, color, url, icon }) => (
            <button
              key={label}
              onClick={() => openShare(url)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition ${color}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input
            readOnly
            value={pageUrl}
            className="flex-1 text-xs px-3 py-2 rounded-lg border bg-muted text-muted-foreground font-mono truncate"
          />
          <Button size="sm" variant="outline" onClick={handleCopyLink}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            {t("opp_copy_link") || "Copier le lien"}
          </Button>
        </div>

        {/* Reference code */}
        <p className="text-[11px] text-muted-foreground/60">
          {t("opp_ref") || "Référence"} : <span className="font-mono">{opp.id}</span>
        </p>
      </Card>
    </div>
  );
}
