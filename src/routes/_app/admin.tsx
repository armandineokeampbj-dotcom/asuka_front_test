import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useLang } from "@/i18n/LanguageProvider";
import {
  LayoutDashboard, Users, BarChart3, Shield, Briefcase, Radio,
  Award, Building2, Coins, ScrollText, Settings, Loader2,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as AuthUser } from "@/context/AuthProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app/admin")({ component: AdminLayout });

function getInitials(user: AuthUser): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

function getAdminRoleLabel(user: AuthUser, isSuperAdmin: boolean, isAdminB: boolean): string {
  if (isSuperAdmin) return "Super Admin";
  if (isAdminB) return "Admin B";
  if (user.adminRole === "collaborator_c") return "Collaborateur";
  return "Administrateur";
}

function AdminLayout() {
  const { user, loading } = useAuth();
  const { hasAnyAdminRole, isSuperAdmin, isAdminB, canManageCollaborators } = useAdminPermissions();
  const { t } = useLang();
  const navigate = useNavigate();
  const loc = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("admin_sidebar_collapsed") === "true"; }
    catch { return false; }
  });

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("admin_sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (loading) return;
    if (!user || !hasAnyAdminRole) {
      navigate({ to: "/login-admin" });
      return;
    }
    if (user.mustChangePassword) {
      if (!loc.pathname.startsWith("/admin/first-login/change-password")) {
        navigate({ to: "/admin/first-login/change-password" });
      }
      return;
    }
    if (user.mustCompleteProfile) {
      if (!loc.pathname.startsWith("/admin/first-login/complete-profile")) {
        navigate({ to: "/admin/first-login/complete-profile" });
      }
      return;
    }
  }, [loading, user, hasAnyAdminRole, loc.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("loading")}
      </div>
    );
  }

  if (!hasAnyAdminRole) return null;

  // ── Nav groups ────────────────────────────────────────────────────────────
  const groups = [
    {
      label: "VUES",
      items: [
        { to: "/admin/dashboard", label: "Dashboard",   icon: LayoutDashboard, show: true },
        { to: "/admin/analytics", label: "Analytics",   icon: BarChart3,       show: true },
      ],
    },
    {
      label: "CONTENU",
      items: [
        { to: "/admin/content/opportunities", label: t("admin_nav_opportunities"), icon: Briefcase,   show: true },
        { to: "/admin/content/pulses",        label: t("admin_nav_pulses"),        icon: Radio,       show: true },
        { to: "/admin/content/badges",        label: t("admin_nav_badges"),        icon: Award,       show: true },
        { to: "/admin/content/institutions",  label: t("admin_nav_institutions"),  icon: Building2,   show: true },
        { to: "/admin/content/rewards",       label: t("admin_nav_rewards"),       icon: Coins,       show: true },
      ],
    },
    {
      label: "GESTION",
      items: [
        { to: "/admin/users", label: t("admin_nav_users"),                                              icon: Users,  show: true },
        { to: "/admin/team",  label: isSuperAdmin ? t("admin_nav_team") : t("admin_nav_my_team"),       icon: Shield, show: canManageCollaborators },
      ],
    },
    {
      label: "SYSTÈME",
      items: [
        { to: "/admin/logs",     label: "Logs",                   icon: ScrollText, show: isSuperAdmin || isAdminB },
        { to: "/admin/settings", label: t("admin_nav_settings"),  icon: Settings,   show: isSuperAdmin },
      ],
    },
  ];

  return (
    /*
     * flex-1 min-h-0 : remplit exactement AppShell.main (overflow-hidden flex flex-col)
     * sans -m-6 : plus de hack de marge négative, plus de conflit overflow-x
     * flex gap-0 : colonne sidebar + colonne main, chacune scrolle seule
     */
    <div className="flex-1 min-h-0 flex gap-0">

      {/* ── Admin sidebar ────────────────────────────────────────────────────── */}
      <TooltipProvider delayDuration={0}>
        <aside className={cn(
          "hidden lg:flex flex-col shrink-0 bg-muted/30 border-r border-border/60",
          "overflow-y-auto",           // scrolle si beaucoup d'items, pas de sticky/h-screen
          "transition-all duration-200 ease-in-out",
          collapsed ? "w-20 items-center py-3 px-3 gap-1" : "w-52 p-4 gap-0"
        )}>

          {/* Toggle button */}
          <div className={cn(
            "flex shrink-0 mb-3",
            collapsed ? "justify-center w-full" : "justify-between items-center px-1"
          )}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold py-1 select-none">
                Admin Panel
              </p>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
                >
                  {collapsed
                    ? <PanelLeftOpen className="h-4 w-4" />
                    : <PanelLeftClose className="h-4 w-4" />
                  }
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  Agrandir le menu
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* ── Groups ─────────────────────────────────────────────────────── */}
          <div className={cn("flex-1 w-full", collapsed ? "space-y-1" : "space-y-4")}>
            {groups.map((group, gi) => {
              const visibleItems = group.items.filter((it) => it.show);
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label}>
                  {/* Collapsed: séparateur fin entre groupes */}
                  {collapsed && gi > 0 && (
                    <div className="w-8 mx-auto my-2 border-t border-border/40" />
                  )}

                  {/* Section label (expanded seulement) */}
                  {!collapsed && (
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-semibold px-2.5 mb-1 select-none">
                      {group.label}
                    </p>
                  )}

                  <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center w-full")}>
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = loc.pathname.startsWith(item.to);

                      if (collapsed) {
                        return (
                          <Tooltip key={item.to}>
                            <TooltipTrigger asChild>
                              <Link
                                to={item.to}
                                className={cn(
                                  "flex items-center justify-center w-10 h-10 rounded-lg transition",
                                  active
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition",
                            active
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-primary")} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Mini-profil ──────────────────────────────────────────────────── */}
          {user && (
            <div className={cn(
              "shrink-0 mt-3 pt-3 border-t border-border/40 w-full",
              collapsed ? "flex justify-center" : ""
            )}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center cursor-default">
                      <span className="text-[11px] font-bold text-primary">{getInitials(user)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {user.firstName} {user.lastName} · {getAdminRoleLabel(user, isSuperAdmin, isAdminB)}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-muted/60 transition">
                  <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">{getInitials(user)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">
                      {user.firstName} {user.lastName[0]}.
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                      {getAdminRoleLabel(user, isSuperAdmin, isAdminB)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </TooltipProvider>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto p-6 pb-28 lg:pb-6">
        <Outlet />
      </main>
    </div>
  );
}
