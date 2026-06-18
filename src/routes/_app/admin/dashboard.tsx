import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, getAuthToken } from "@/context/AuthProvider";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminAPI, adminTeamAPI } from "@/lib/api-client";
import { useLang } from "@/i18n/LanguageProvider";
import {
  Users, Briefcase, BarChart3, Award, Shield, ScrollText,
  Plus, Loader2, AlertTriangle, User, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const Route = createFileRoute("/_app/admin/dashboard")({ component: AdminDashboard });

function AdminDashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const { isSuperAdmin, isAdminB, isCollaborator, isReader, permissions } = useAdminPermissions();
  const [stats, setStats] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<{ adminsB: number; collaborators: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const analyticsPromise = adminAPI.getAnalytics();
        const teamPromise = (isSuperAdmin || isAdminB)
          ? adminTeamAPI.getCollaborators().then((r: any) => r.collaborators ?? [])
          : Promise.resolve([]);
        const adminsBPromise = isSuperAdmin
          ? adminTeamAPI.getAdminsB().then((r: any) => r.adminsB ?? [])
          : Promise.resolve([]);

        const [analyticsData, myCollabs, adminsB] = await Promise.all([analyticsPromise, teamPromise, adminsBPromise]);
        setStats(analyticsData);
        if (isSuperAdmin) setTeamStats({ adminsB: adminsB.length, collaborators: myCollabs.length });
        else if (isAdminB) setTeamStats({ adminsB: 0, collaborators: myCollabs.length });
      } catch {
        toast.error(t("admin_load_error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isSuperAdmin, isAdminB]);

  const handleActivateUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/activate-user-profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("activation_failed");
      updateUser({ hasUserProfile: true });
      toast.success(t("admin_activate_success"));
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t("admin_activate_error"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
      </div>
    );
  }

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isAdminB
    ? "Admin B"
    : t("admin_collab_role").replace("{perm}", permissions ?? "lecteur");
  const roleColor = isSuperAdmin ? "bg-primary/10 text-primary" : isAdminB ? "bg-secondary/10 text-secondary-foreground" : "bg-muted";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t("admin_greeting").replace("{name}", user?.firstName ?? "")}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={roleColor}>{roleLabel}</Badge>
            {isReader && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-500 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> {t("admin_readonly_badge")}
              </Badge>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {user?.hasUserProfile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/dashboard" })}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              {t("admin_user_space")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleActivateUserProfile}
              className="gap-2 border-dashed"
            >
              <UserPlus className="h-4 w-4" />
              {t("admin_create_profile")}
            </Button>
          )}
        </div>
      </div>

      {/* Bandeau lecteur */}
      {isReader && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t("admin_readonly_msg")}
          </p>
        </Card>
      )}

      {/* Stats plateforme */}
      {stats && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("admin_section_platform")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: t("admin_stat_users"), value: stats.users, icon: Users, color: "from-primary/15 to-primary/5" },
              { label: t("admin_stat_opps"), value: stats.opps, icon: Briefcase, color: "from-secondary/15 to-secondary/5" },
              { label: t("admin_stat_apps"), value: stats.apps, icon: BarChart3, color: "from-accent/15 to-accent/5" },
              { label: t("admin_stat_pulses"), value: stats.pulses, icon: Award, color: "from-success/15 to-success/5" },
              { label: t("admin_stat_xp"), value: stats.xp?.toLocaleString(), icon: Award, color: "from-primary/10 to-secondary/5" },
              { label: t("admin_stat_rewards"), value: stats.rewards?.toLocaleString(), icon: Award, color: "from-accent/10 to-accent/5" },
            ].map((c) => (
              <Card key={c.label} className={`p-4 bg-gradient-to-br ${c.color} border-border/40`}>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-0.5">{c.value ?? "—"}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats équipe (super_admin + admin_b) */}
      {teamStats !== null && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isSuperAdmin ? t("admin_section_team") : t("admin_section_my_team")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {isSuperAdmin && (
              <Card className="p-4 bg-gradient-to-br from-primary/10 to-transparent border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin_team_admins_b")}</p>
                    <p className="text-2xl font-bold">{teamStats.adminsB}</p>
                  </div>
                  <Shield className="h-8 w-8 text-primary/30" />
                </div>
                <Link to="/admin/team">
                  <Button size="sm" variant="outline" className="mt-3 w-full text-xs">
                    {t("admin_team_manage")}
                  </Button>
                </Link>
              </Card>
            )}
            <Card className="p-4 bg-gradient-to-br from-secondary/10 to-transparent border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isAdminB ? t("admin_team_my_collabs") : t("admin_team_collabs")}
                  </p>
                  <p className="text-2xl font-bold">{teamStats.collaborators}</p>
                </div>
                <Users className="h-8 w-8 text-secondary/30" />
              </div>
              <Link to="/admin/team">
                <Button size="sm" variant="outline" className="mt-3 w-full text-xs">
                  {isAdminB ? t("admin_team_view") : t("admin_team_view_collabs")}
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      )}

      {/* Carte "Mon responsable" pour collaborateur_c */}
      {isCollaborator && user?.parentAdminId && (
        <Card className="p-4 border-border/40">
          <h2 className="text-sm font-semibold mb-2">{t("admin_my_manager")}</h2>
          <p className="text-xs text-muted-foreground">Admin B · {user.parentAdminId}</p>
        </Card>
      )}

      {/* Accès rapides */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("admin_section_quick")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <Link to="/admin/team">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {t("admin_create_admin_b")}
              </Button>
            </Link>
          )}
          {(isSuperAdmin || isAdminB) && (
            <>
              <Link to="/admin/team">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> {t("admin_create_collab")}
                </Button>
              </Link>
              <Link to="/admin/logs">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" /> {t("admin_view_logs")}
                </Button>
              </Link>
            </>
          )}
          <Link to="/admin/content/opportunities">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> {t("admin_nav_opportunities")}
            </Button>
          </Link>
          <Link to="/admin/analytics">
            <Button size="sm" variant="outline" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
