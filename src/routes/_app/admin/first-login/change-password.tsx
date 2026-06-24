import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthProvider";
import type { User } from "@/context/AuthProvider";
import { authExtrasAPI } from "@/lib/api-client";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/first-login/change-password")({ component: ChangePasswordPage });

function ChangePasswordPage() {
  const { t } = useLang();
  const { user, updateUserFlags, setAuthData } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = newPassword.length >= 8 && newPassword === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (newPassword !== confirm) {
      toast.error(t("admin_fl_pw_mismatch"));
      return;
    }

    setSaving(true);
    try {
      const result = await authExtrasAPI.changePassword({ newPassword });
      if (result?.token && user) {
        setAuthData(result.token, { ...(user as User), mustChangePassword: false });
      } else {
        updateUserFlags({ mustChangePassword: false });
      }
      toast.success(t("admin_fl_pw_success"));
      navigate({ to: "/admin/first-login/complete-profile" });
    } catch (err: any) {
      toast.error(err?.message || t("admin_fl_pw_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 py-8">
      <div className="text-center space-y-1">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">{t("admin_fl_change_pw_title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("admin_fl_change_pw_desc")}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("admin_fl_new_pw")}</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder={t("admin_fl_pw_hint")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && newPassword.length < 8 && (
              <p className="text-xs text-destructive">{t("admin_fl_pw_min")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("admin_fl_confirm_pw")}</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder={t("admin_fl_repeat_pw")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm && newPassword !== confirm && (
              <p className="text-xs text-destructive">{t("admin_fl_pw_mismatch")}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!valid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin_fl_set_pw_btn")}
          </Button>
        </form>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-2 justify-center">
        <div className="h-2 w-8 rounded-full bg-primary" />
        <div className="h-2 w-8 rounded-full bg-muted" />
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("admin_fl_step1")}</p>
    </div>
  );
}
