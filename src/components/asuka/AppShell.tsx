import { Link, useLocation, useNavigate, Outlet } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationsBell } from "./NotificationsBell";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { LayoutDashboard, User, Briefcase, Sparkles, Radio, LogOut, Shield, Coins } from "lucide-react";
import { useEffect } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AppShell() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const loc = useLocation();
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t("loading")}</div>;
  }

  const baseItems = [
    { to: "/dashboard", label: t("nav_dashboard"), icon: LayoutDashboard },
    { to: "/profile", label: t("nav_profile"), icon: User },
    { to: "/opportunities", label: t("nav_opportunities"), icon: Briefcase },
    { to: "/coach", label: t("nav_coach"), icon: Sparkles },
    { to: "/pulse", label: t("nav_pulse"), icon: Radio },
    { to: "/rewards", label: t("nav_rewards"), icon: Coins },
  ];
  const items = isAdmin
    ? [...baseItems, { to: "/admin", label: "Admin", icon: Shield }]
    : baseItems;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 glass">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <LanguageSwitcher />
            <button
              onClick={async () => {
                await signOut();
                nav({ to: "/" });
              }}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav_signout")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            {items.map((it) => {
              const active = loc.pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? "bg-gradient-hero text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 pb-24 lg:pb-0"><Outlet /></main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border/60">
        <div className={`grid ${items.length >= 6 ? "grid-cols-6" : "grid-cols-5"}`}>
          {items.map((it) => {
            const active = loc.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link key={it.to} to={it.to} className={`flex flex-col items-center justify-center py-2.5 text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5 mb-0.5" />
                {it.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}