import { Link, useLocation, useNavigate, Outlet } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationsBell } from "./NotificationsBell";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import {
  LayoutDashboard, User, Briefcase, Sparkles, Radio, LogOut, Shield, Coins,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User as AuthUser } from "@/context/AuthProvider";

function getRoleLabel(user: AuthUser): string {
  if (user.adminRole) return "Administrateur";
  return "Utilisateur";
}

function getInitials(user: AuthUser): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

export function AppShell() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const loc = useLocation();
  const { isAdmin } = useIsAdmin();

  const isAdminRoute = loc.pathname.startsWith("/admin");

  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("app_nav_collapsed") === "true"; }
    catch { return false; }
  });

  const toggleNav = () => {
    setNavCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("app_nav_collapsed", String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/auth" }); return; }
    if (user.adminRole && !user.hasUserProfile) {
      toast.info(t("admin_activate_toast"));
      nav({ to: "/admin/dashboard" });
    }
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t("loading")}</div>;
  }

  const baseItems = [
    { to: "/dashboard",     label: t("nav_dashboard"),     icon: LayoutDashboard },
    { to: "/profile",       label: t("nav_profile"),       icon: User },
    { to: "/opportunities", label: t("nav_opportunities"), icon: Briefcase },
    { to: "/coach",         label: t("nav_coach"),         icon: Sparkles },
    { to: "/pulse",         label: t("nav_pulse"),         icon: Radio },
    { to: "/rewards",       label: t("nav_rewards"),       icon: Coins },
  ];

  const sidebarHidden = isAdminRoute && navCollapsed;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 z-30 border-b border-border/60 glass">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">

          <div className="flex items-center gap-2">
            {isAdminRoute && (
              <button
                onClick={toggleNav}
                title={navCollapsed ? "Afficher le menu" : "Masquer le menu"}
                className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
              >
                {navCollapsed
                  ? <PanelLeftOpen className="h-4 w-4" />
                  : <PanelLeftClose className="h-4 w-4" />
                }
              </button>
            )}
            <Logo />
          </div>

          <div className="flex items-center gap-3">
            {user.adminRole && (
              <Button
                variant="outline" size="sm"
                onClick={() => nav({ to: "/admin/dashboard" })}
                className="gap-1.5 border-primary/30 text-primary hidden sm:inline-flex"
              >
                <Shield className="h-3.5 w-3.5" />
                {t("nav_admin_space")}
              </Button>
            )}
            <NotificationsBell />
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={async () => { await signOut(); nav({ to: "/" }); }}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav_signout")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/*
          overflow-hidden retiré du container max-w : il clippait le -m-6 de AdminLayout
          gap-6 retiré : remplacé par mr-6/mr-0 sur l'aside pour éviter le gap fantôme
        */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex">

          {/* ── Left sidebar ─────────────────────────────────────────────── */}
          <aside className={cn(
            "hidden lg:flex flex-col shrink-0 overflow-y-auto transition-all duration-200 ease-in-out",
            sidebarHidden
              ? "w-0 mr-0 p-0 opacity-0 pointer-events-none overflow-hidden"
              : "w-[220px] mr-6"
          )}>

            {/* Nav items */}
            <div className="flex-1 py-6 space-y-1">
              {baseItems.map((it) => {
                const active = loc.pathname.startsWith(it.to);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                      active
                        ? "bg-gradient-hero text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {it.label}
                  </Link>
                );
              })}

              {/* Admin link — visuellement séparé du reste */}
              {isAdmin && (
                <>
                  <div className="my-2 border-t border-border/40" />
                  <Link
                    to="/admin"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                      isAdminRoute
                        ? "bg-gradient-hero text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    Admin
                  </Link>
                </>
              )}
            </div>

            {/* Mini-profil utilisateur */}
            <div className="border-t border-border/40 py-4 px-1 shrink-0">
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/60 transition">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-primary">{getInitials(user)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user.firstName} {user.lastName[0]}.
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{getRoleLabel(user)}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────── */}
          {/*
            Sur les routes admin : overflow-hidden + flex flex-col
            → AdminLayout (flex-1 flex) remplit exactement cette hauteur
            → chaque colonne (sidebar + main admin) scrolle indépendamment
            → plus besoin de -m-6 ni de sticky h-screen
            Sur les routes user : overflow-y-auto classique avec padding
          */}
          <main className={cn(
            "flex-1 min-w-0 min-h-0",
            isAdminRoute
              ? "overflow-hidden flex flex-col"
              : "overflow-y-auto py-6 pb-28 lg:pb-6"
          )}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border/60">
        <div className={`grid ${(baseItems.length + (isAdmin ? 1 : 0)) >= 6 ? "grid-cols-6" : "grid-cols-5"}`}>
          {[...baseItems, ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : [])].map((it) => {
            const active = loc.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex flex-col items-center justify-center py-2.5 text-[10px] font-medium overflow-hidden ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5 mb-0.5 shrink-0" />
                <span className="truncate w-full text-center px-0.5">{it.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
