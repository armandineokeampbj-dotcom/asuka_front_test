import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/context/AuthProvider";

export function PublicHeader() {
  const { t } = useLang();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 header-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">{t("nav_dashboard")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-gradient-hero shadow-glow border-0">
              <Link to="/auth" search={{ mode: "signin" }}>{t("nav_signin")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}