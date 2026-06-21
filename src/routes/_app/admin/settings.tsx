import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthProvider";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Settings, Wrench, QrCode, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";
import { adminAPI } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/settings")({ component: AdminSettingsPage });

function AdminSettingsPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const { isSuperAdmin, isAdminB } = useAdminPermissions();

  // Fix all slugs
  const [fixingAll, setFixingAll] = useState(false);
  const [fixResult, setFixResult] = useState<{ fixed: number; skipped: number; total: number } | null>(null);

  // Set individual slug
  const [slugEmail, setSlugEmail] = useState("");
  const [slugValue, setSlugValue] = useState("");
  const [settingSlug, setSettingSlug] = useState(false);

  const canMaintain = isSuperAdmin || isAdminB;

  const handleFixAll = async () => {
    setFixingAll(true);
    setFixResult(null);
    try {
      const res = await adminAPI.fixProfileSlugs();
      setFixResult(res);
      toast.success(`${res.fixed} slug(s) régénéré(s) sur ${res.total} profils sans lien public.`);
    } catch {
      toast.error("Erreur lors de la réparation des slugs.");
    } finally {
      setFixingAll(false);
    }
  };

  const handleSetSlug = async () => {
    if (!slugEmail.trim() || !slugValue.trim()) {
      toast.error("Email et slug requis.");
      return;
    }
    setSettingSlug(true);
    try {
      await adminAPI.setUserSlug({ email: slugEmail.trim(), slug: slugValue.trim() });
      toast.success(`Slug "${slugValue.trim()}" appliqué à ${slugEmail.trim()}.`);
      setSlugEmail("");
      setSlugValue("");
    } catch (err: any) {
      if (err?.message?.includes("409")) {
        toast.error("Ce slug est déjà utilisé par un autre profil.");
      } else {
        toast.error("Erreur : utilisateur introuvable ou slug invalide.");
      }
    } finally {
      setSettingSlug(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" /> {t("admin_settings_title")}
      </h1>

      {/* Compte */}
      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">{t("admin_settings_account")}</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex gap-3 text-muted-foreground">
            <span className="w-32 shrink-0">{t("admin_col_name")}</span>
            <span className="font-medium text-foreground">{user?.firstName} {user?.lastName}</span>
          </div>
          <div className="flex gap-3 text-muted-foreground">
            <span className="w-32 shrink-0">{t("admin_col_email")}</span>
            <span className="font-medium text-foreground">{user?.email}</span>
          </div>
          <div className="flex gap-3 text-muted-foreground">
            <span className="w-32 shrink-0">{t("admin_col_role")}</span>
            <span className="font-medium text-foreground">{user?.adminRole ?? user?.role}</span>
          </div>
          {user?.permissions && (
            <div className="flex gap-3 text-muted-foreground">
              <span className="w-32 shrink-0">{t("admin_team_perm_label")}</span>
              <span className="font-medium text-foreground">{user.permissions}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Maintenance — visible pour superadmin et adminB uniquement */}
      {canMaintain && (
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" /> Maintenance
          </h2>

          {/* Réparer tous les QR codes */}
          <div className="border border-border/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <QrCode className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Réparer les liens QR Code</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Génère un slug de profil public pour tous les utilisateurs qui n'en ont pas encore.
                  Cela corrige les profils dont le QR code renvoie "Profil introuvable".
                </p>
              </div>
            </div>

            {fixResult && (
              <div className="flex items-center gap-2 text-xs bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{fixResult.fixed}</strong> profil(s) réparé(s) ·{" "}
                  {fixResult.skipped > 0 && <><strong>{fixResult.skipped}</strong> ignoré(s) (conflit) · </>}
                  {fixResult.total} traité(s) au total
                </span>
              </div>
            )}

            <Button
              size="sm"
              onClick={handleFixAll}
              disabled={fixingAll}
              className="gap-2"
            >
              {fixingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
              {fixingAll ? "Réparation en cours…" : "Réparer tous les QR codes"}
            </Button>
          </div>

          {/* Forcer un slug spécifique */}
          <div className="border border-border/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Forcer un slug pour un utilisateur</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assigne manuellement un slug de profil public à un utilisateur précis (par email).
                  Utile pour corriger un profil spécifique sans tout régénérer.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="Email de l'utilisateur"
                value={slugEmail}
                onChange={(e) => setSlugEmail(e.target.value)}
                className="text-sm h-9"
              />
              <Input
                placeholder="Nouveau slug (ex: jean-dupont-x4z1)"
                value={slugValue}
                onChange={(e) => setSlugValue(e.target.value)}
                className="text-sm h-9"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetSlug}
                disabled={settingSlug || !slugEmail.trim() || !slugValue.trim()}
                className="gap-2 h-9"
              >
                {settingSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Appliquer
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Le slug doit être unique. Le lien public sera : <code className="font-mono">/p/{slugValue || "votre-slug"}</code>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
