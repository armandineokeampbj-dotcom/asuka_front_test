import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthProvider";
import type { User } from "@/context/AuthProvider";
import { authExtrasAPI, profileAPI } from "@/lib/api-client";
import { UserCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/first-login/complete-profile")({ component: CompleteProfilePage });

function CompleteProfilePage() {
  const { t } = useLang();
  const { user, updateUserFlags, setAuthData } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const valid = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !user) return;

    setSaving(true);
    try {
      // Update the user profile (firstName, lastName, phone)
      await profileAPI.updateProfile(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });

      // Clear the mustCompleteProfile flag, sync adminProfile, get fresh JWT
      const flagResult = await authExtrasAPI.completeProfileFlag({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (flagResult?.token && user) {
        setAuthData(flagResult.token, { ...(user as User), mustCompleteProfile: false, firstName: firstName.trim(), lastName: lastName.trim() });
      } else {
        updateUserFlags({ mustCompleteProfile: false });
      }
      toast.success(t("admin_fl_complete_success"));
      navigate({ to: "/admin/dashboard" });
    } catch (err: any) {
      toast.error(err?.message || t("admin_fl_complete_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 py-8">
      <div className="text-center space-y-1">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">{t("admin_fl_complete_title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("admin_fl_complete_desc")}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email read-only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t("admin_fl_email_label")}</label>
            <Input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t("admin_firstname")} <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder={t("admin_firstname")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t("admin_lastname")} <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder={t("admin_lastname")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("admin_fl_phone_label")} <span className="text-muted-foreground text-xs">{t("admin_fl_optional")}</span>
            </label>
            <Input
              type="tel"
              placeholder="+33 6 00 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <Button type="submit" className="w-full" disabled={!valid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin_fl_complete_btn")}
          </Button>
        </form>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-2 justify-center">
        <div className="h-2 w-8 rounded-full bg-primary/40" />
        <div className="h-2 w-8 rounded-full bg-primary" />
        <div className="h-2 w-8 rounded-full bg-muted" />
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("admin_fl_step2") || "Étape 2 sur 3"}</p>
    </div>
  );
}
