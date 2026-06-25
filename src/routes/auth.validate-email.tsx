import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/asuka/Logo";
import { LanguageSwitcher } from "@/components/asuka/LanguageSwitcher";
import { Loader2 } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/auth/validate-email")({
  component: ValidateEmailPage,
});

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function ValidateEmailPage() {
  const { t } = useLang();
  const { setAuthData } = useAuth();
  const nav = useNavigate();
  const searchParams = useSearch({ from: "/auth/validate-email" });

  const token = (searchParams as any).token as string | undefined;
  const role = (searchParams as any).role as string | undefined; // 'admin' ou undefined

  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null); // 'TOKEN_EXPIRED' ou message texte
  const [message, setMessage] = useState<string>("");

  // États renvoi de lien
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    // Nettoyer toute session existante pour éviter la pollution de token
    // (ex : super_admin qui teste la vérification depuis son propre navigateur)
    if (role === "admin") {
      localStorage.removeItem("asuka_token");
      localStorage.removeItem("asuka_user");
    }
    validateEmail();
  }, []);

  const validateEmail = async () => {
    if (!token) {
      setError(t("auth_invalid_link") || "Lien de validation invalide");
      setValidating(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/validate-email-link?token=${encodeURIComponent(token)}`,
        { method: "GET" }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === "TOKEN_EXPIRED") {
          setError("TOKEN_EXPIRED");
        } else {
          setError(data.error?.message || t("auth_validation_failed") || "Validation échouée");
        }
        setValidating(false);
        return;
      }

      if (data.success) {
        const successMsg = data.message || t("auth_email_verified") || "Email vérifié avec succès";
        setMessage(successMsg);
        toast.success(successMsg);
        setValidating(false);

        // Utilisateurs normaux : connexion automatique
        if (data.token && data.user && !data.isAdmin && role !== "admin") {
          setAuthData(data.token, data.user);
        }

        setTimeout(() => {
          if (data.isAdmin || role === "admin") {
            // Admins : redirection vers la page de connexion pour s'authentifier proprement
            nav({ to: "/login-admin" });
          } else {
            nav({ to: "/dashboard" });
          }
        }, 2500);
      } else {
        setError(t("auth_validation_failed") || "Validation échouée");
        setValidating(false);
      }
    } catch (err: any) {
      setError(err.message || t("auth_validation_failed") || "Validation échouée");
      setValidating(false);
    }
  };

  const handleResend = async () => {
    if (!resendEmail.trim() || resendBusy) return;
    setResendBusy(true);
    try {
      await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      setResendDone(true);
    } catch {
      setResendDone(true); // toujours afficher succès (sécurité)
    } finally {
      setResendBusy(false);
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
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-bold">
              {t("auth_validating_email") || "Vérification de votre email..."}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("auth_please_wait") || "Veuillez patienter..."}
            </p>
          </div>

        ) : error === "TOKEN_EXPIRED" ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">⏰</div>
            <h1 className="text-2xl font-bold">{t("auth_token_expired")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("auth_token_expired_desc")}
            </p>
            <div className="space-y-3 mt-4">
              <Input
                type="email"
                placeholder="votre@email.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResend()}
                disabled={resendDone}
              />
              <Button
                onClick={handleResend}
                disabled={!resendEmail.trim() || resendBusy || resendDone}
                className="w-full bg-gradient-hero"
              >
                {resendBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {resendDone ? t("auth_resend_done") : t("auth_resend_submit")}
              </Button>
              {resendDone && (
                <p className="text-sm text-muted-foreground">
                  {t("auth_check_spam")}
                </p>
              )}
            </div>
            <button
              onClick={() => nav({ to: role === "admin" ? "/login-admin" : "/auth" })}
              className="text-xs text-muted-foreground hover:text-foreground mt-4 block mx-auto"
            >
              ← {role === "admin" ? t("auth_back_admin") : t("auth_back_to_signin")}
            </button>
          </div>

        ) : error ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">
              {t("auth_validation_failed") || "Échec de la validation"}
            </h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => nav({ to: role === "admin" ? "/login-admin" : "/auth" })}
              className="mt-6 px-4 py-2 bg-gradient-hero rounded-md text-white font-medium hover:opacity-90"
            >
              {role === "admin" ? t("auth_back_admin") : t("auth_back_to_signin") || "Retour à la connexion"}
            </button>
          </div>

        ) : (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold text-green-600">
              {t("auth_validation_success") || "Email vérifié !"}
            </h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">
              {role === "admin"
                ? (t("auth_admin_redirecting_login") || "Redirection vers la page de connexion...")
                : (t("auth_redirecting") || "Redirection vers le tableau de bord...")}
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Asuka One
          </a>
        </div>
      </Card>
    </div>
  );
}
