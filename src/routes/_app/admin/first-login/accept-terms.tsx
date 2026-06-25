import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import type { User } from "@/context/AuthProvider";
import { authExtrasAPI } from "@/lib/api-client";
import { ShieldCheck, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/first-login/accept-terms")({ component: AcceptTermsPage });

function AcceptTermsPage() {
  const { t } = useLang();
  const { user, updateUserFlags, setAuthData } = useAuth();
  const navigate = useNavigate();

  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (atBottom) setScrolledToBottom(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return;

    setSaving(true);
    try {
      const result = await authExtrasAPI.acceptTerms();
      if (result?.token && user) {
        setAuthData(result.token, { ...(user as User), mustAcceptTerms: false });
      } else {
        updateUserFlags({ mustAcceptTerms: false } as any);
      }
      toast.success(t("admin_fl_terms_success") || "Politique acceptée. Bienvenue sur la plateforme.");
      navigate({ to: "/admin/dashboard" });
    } catch (err: any) {
      toast.error(err?.message || t("admin_fl_terms_error") || "Erreur lors de la validation");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = user?.adminRole === "super_admin"
    ? "Super Administrateur"
    : user?.adminRole === "admin_b"
    ? "Administrateur"
    : "Collaborateur";

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">
          {t("admin_fl_terms_title") || "Politique de confidentialité"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("admin_fl_terms_desc") || `En tant que ${roleLabel}, vous devez lire et accepter les conditions suivantes avant d'accéder à la plateforme.`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Policy document */}
        <Card className="p-0 overflow-hidden">
          <div
            onScroll={handleScroll}
            className="h-96 overflow-y-auto p-6 space-y-5 text-sm text-foreground/90 leading-relaxed"
          >
            <div>
              <h2 className="text-base font-semibold mb-2">Politique d'accès et de traitement des données — Rôle : {roleLabel}</h2>
              <p className="text-muted-foreground text-xs">Plateforme Asuka One — Document obligatoire avant premier accès</p>
            </div>

            <section className="space-y-1.5">
              <h3 className="font-semibold">1. Nature des données auxquelles vous accédez</h3>
              <p>
                En qualité d'administrateur de la plateforme Asuka One, vous avez accès à des données à caractère personnel
                des utilisateurs : identités, coordonnées, parcours professionnels, données financières (soldes, transactions),
                résultats d'évaluation, documents et fichiers personnels. Ces données sont couvertes par le Règlement Général
                sur la Protection des Données (RGPD) et toute législation nationale applicable.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">2. Obligations de confidentialité</h3>
              <p>Vous vous engagez à :</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/80">
                <li>Ne jamais divulguer les données des utilisateurs à des tiers non autorisés, y compris vos proches, collègues non habilités ou partenaires commerciaux.</li>
                <li>N'utiliser les données consultées qu'aux seules fins de gestion, modération et amélioration de la plateforme.</li>
                <li>Respecter le principe de minimisation : n'accéder qu'aux données strictement nécessaires à l'exercice de votre rôle.</li>
                <li>Ne pas effectuer d'exports, de copies ou de transferts de données sans autorisation écrite de l'administrateur principal.</li>
                <li>Maintenir la confidentialité des données même après la fin de votre rôle d'administrateur.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">3. Sécurité du compte et des accès</h3>
              <ul className="list-disc pl-5 space-y-1 text-foreground/80">
                <li>Vous êtes l'unique responsable de la sécurité de vos identifiants de connexion.</li>
                <li>Vous ne devez jamais partager votre accès avec une autre personne, quelle qu'en soit la raison.</li>
                <li>Vous devez utiliser la plateforme exclusivement depuis des appareils sécurisés et des réseaux de confiance.</li>
                <li>Toute suspicion de compromission de vos identifiants doit être immédiatement signalée à l'administrateur principal.</li>
                <li>Vous devez vous déconnecter après chaque session sur un appareil partagé.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">4. Utilisations strictement interdites</h3>
              <p>Il vous est formellement interdit de :</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/80">
                <li>Utiliser les données personnelles des utilisateurs à des fins personnelles, commerciales ou non liées à la gestion de la plateforme.</li>
                <li>Discriminer, cibler ou traiter différemment des utilisateurs sur la base de leurs données personnelles.</li>
                <li>Contourner, désactiver ou tester les mesures de sécurité de la plateforme.</li>
                <li>Accéder à des sections ou fonctionnalités qui ne relèvent pas de votre niveau d'autorisation.</li>
                <li>Partager des captures d'écran, extraits ou informations issues de la plateforme sur des canaux non sécurisés.</li>
                <li>Modifier, supprimer ou altérer des données utilisateurs en dehors des procédures officielles.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">5. Signalement des incidents</h3>
              <p>
                En cas d'incident de sécurité, de violation de données ou de comportement suspect (y compris de votre part
                par erreur), vous êtes tenu de le signaler immédiatement à l'administrateur principal, sans délai et sans
                chercher à dissimuler l'incident. Le non-signalement d'une violation constitue en soi une faute grave.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">6. Responsabilité légale</h3>
              <p>
                Tout manquement aux obligations énoncées dans ce document peut entraîner :
              </p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/80">
                <li>La révocation immédiate de vos droits d'accès à la plateforme.</li>
                <li>Des sanctions disciplinaires ou contractuelles selon votre relation avec l'organisation.</li>
                <li>Des poursuites civiles et/ou pénales en application du RGPD, de la loi Informatique et Libertés et du Code pénal.</li>
                <li>La mise en cause de votre responsabilité personnelle pour les dommages causés aux utilisateurs.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">7. Durée des obligations</h3>
              <p>
                Ces obligations s'appliquent pour toute la durée de votre accès à la plateforme et persistent
                indéfiniment après la fin de votre rôle, notamment en ce qui concerne la confidentialité des données
                auxquelles vous avez eu accès.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-semibold">8. Droits des utilisateurs</h3>
              <p>
                Les utilisateurs de la plateforme disposent de droits reconnus par le RGPD (accès, rectification,
                effacement, portabilité, opposition). En tant qu'administrateur, vous êtes tenu de faciliter l'exercice
                de ces droits et de ne pas y faire obstacle.
              </p>
            </section>

            <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
              En cochant la case ci-dessous et en cliquant sur "Accepter et terminer", vous confirmez avoir lu,
              compris et accepté sans réserve l'intégralité de cette politique. Cette acceptation est enregistrée
              avec la date et l'heure de votre premier accès.
            </div>
          </div>

          {/* Scroll indicator */}
          {!scrolledToBottom && (
            <div className="flex items-center justify-center gap-1.5 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
              Faites défiler pour lire la politique complète
            </div>
          )}
        </Card>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <div className="mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="h-4 w-4 rounded accent-primary cursor-pointer"
              disabled={!scrolledToBottom}
            />
          </div>
          <span className={`text-sm leading-snug ${!scrolledToBottom ? "text-muted-foreground/50" : "text-foreground"}`}>
            {t("admin_fl_terms_checkbox") || (
              <>
                Je déclare avoir lu et accepté la politique de confidentialité ci-dessus dans son intégralité.
                Je m'engage à respecter l'ensemble des obligations mentionnées dans ce document.
              </>
            )}
          </span>
        </label>

        {!scrolledToBottom && (
          <p className="text-xs text-muted-foreground text-center">
            Lisez la politique jusqu'en bas pour pouvoir l'accepter.
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!accepted || saving}
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : (t("admin_fl_terms_btn") || "J'accepte et je termine la configuration")
          }
        </Button>
      </form>

      {/* Progress */}
      <div className="flex items-center gap-2 justify-center">
        <div className="h-2 w-8 rounded-full bg-primary/40" />
        <div className="h-2 w-8 rounded-full bg-primary/40" />
        <div className="h-2 w-8 rounded-full bg-primary" />
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("admin_fl_step3") || "Étape 3 sur 3 — Dernière étape"}</p>
    </div>
  );
}
