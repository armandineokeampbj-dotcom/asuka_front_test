import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthProvider";
import { Settings } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/settings")({ component: AdminSettingsPage });

function AdminSettingsPage() {
  const { t } = useLang();
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" /> {t("admin_settings_title")}
      </h1>
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
    </div>
  );
}
