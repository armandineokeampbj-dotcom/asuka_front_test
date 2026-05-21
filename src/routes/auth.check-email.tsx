import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/asuka/Logo";
import { LanguageSwitcher } from "@/components/asuka/LanguageSwitcher";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/auth/check-email")({
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { t } = useLang();
  const searchParams = useSearch({ from: "/auth/check-email" });
  const nav = useNavigate();
  const email = (searchParams as any).email || "";

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-gradient-aurora pointer-events-none" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>

      <Card className="relative w-full max-w-md p-8 glass border-border/50 shadow-glow">
        <div className="text-center space-y-6">
          {/* Icône email */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-white">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold">
            {t("auth_check_email_title") || "Vérifiez votre email"}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t("auth_check_email_message_1") ||
              "Nous avons envoyé un lien de confirmation à:"}
          </p>

          <p className="text-base font-semibold text-foreground">{email}</p>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {t("auth_check_email_message_2") ||
                "Veuillez cliquer sur le lien dans l'email pour confirmer votre adresse email et créer votre compte."}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("auth_check_email_message_3") ||
              "Le lien expire dans 24 heures."}
          </p>

          <div className="border-t pt-6">
            <p className="text-xs text-muted-foreground mb-4">
              {t("auth_no_email") || "Vous n'avez pas reçu l'email?"}
            </p>
            <button
              onClick={() => nav({ to: "/auth" })}
              className="w-full px-4 py-2 bg-gradient-hero rounded-md text-white font-medium hover:opacity-90 transition-opacity"
            >
              {t("auth_back_to_signup") || "Retour à l'inscription"}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Asuka One
          </a>
        </div>
      </Card>
    </div>
  );
}
