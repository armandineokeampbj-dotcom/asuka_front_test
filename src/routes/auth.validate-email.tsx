import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/asuka/Logo";
import { LanguageSwitcher } from "@/components/asuka/LanguageSwitcher";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/auth/validate-email")({
  component: ValidateEmailPage,
});

function ValidateEmailPage() {
  const { t } = useLang();
  const { setAuthData } = useAuth();
  const nav = useNavigate();
  const searchParams = useSearch({ from: "/auth/validate-email" });
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    validateEmail();
  }, []);

  const validateEmail = async () => {
    try {
      const token = (searchParams as any).token;

      if (!token) {
        setError(t("auth_invalid_link") || "Lien de validation invalide");
        setValidating(false);
        return;
      }

      // Appeler l'API pour valider le lien
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const response = await fetch(
        `${apiUrl}/api/auth/validate-email-link?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Email validation failed");
      }

      const data = await response.json();

      // Mettre à jour l'authentification via le contexte
      if (data.token && data.user) {
        setAuthData(data.token, data.user);

        setMessage(data.message || "Email verified successfully!");
        toast.success(t("auth_email_verified") || "Email vérifié avec succès");

        // Rediriger au dashboard après un court délai
        setTimeout(() => {
          nav({ to: "/dashboard" });
        }, 2000);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Validation failed";
      setError(errorMsg);
      toast.error(errorMsg);
      setValidating(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-gradient-aurora pointer-events-none" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>

      <Card className="relative w-full max-w-md p-8 glass border-border/50 shadow-glow">
        {validating ? (
          <div className="text-center space-y-4">
            <div className="animate-spin">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
            <h1 className="text-2xl font-bold">
              {t("auth_validating_email") || "Vérification de votre email..."}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("auth_please_wait") || "Veuillez patienter..."}
            </p>
          </div>
        ) : error ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">
              {t("auth_validation_failed") || "Échec de la validation"}
            </h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => nav({ to: "/auth" })}
              className="mt-6 px-4 py-2 bg-gradient-hero rounded-md text-white font-medium hover:opacity-90"
            >
              {t("auth_back_to_signin") || "Retour à la connexion"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-green-600">
              {t("auth_validation_success") || "Email vérifié!"}
            </h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">
              {t("auth_redirecting") || "Redirection vers le tableau de bord..."}
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Asuka One
          </a>
        </div>
      </Card>
    </div>
  );
}
