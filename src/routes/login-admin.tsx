import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/login-admin")({ component: LoginAdminPage });

function LoginAdminPage() {
  const { signin } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      const { user } = await signin(email, password);

      if (!user.adminRole) {
        setError(t("admin_unauthorized"));
        return;
      }

      if (user.mustChangePassword) {
        navigate({ to: "/admin/first-login/change-password" });
        return;
      }

      if (user.mustCompleteProfile) {
        navigate({ to: "/admin/first-login/complete-profile" });
        return;
      }

      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin_login_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-white">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">ASUKA</span>
          </div>
          <p className="text-zinc-400 text-sm">{t("admin_space")}</p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-5">
          <div>
            <h1 className="text-lg font-semibold text-white">{t("admin_login")}</h1>
            <p className="text-zinc-400 text-xs mt-0.5">{t("admin_team_only")}</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">{t("admin_email")}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@asuka.com"
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">{t("auth_password")}</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-primary"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth_signin_btn")}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-600">
          {t("admin_user_login")}{" "}
          <a href="/auth" className="text-zinc-400 hover:text-white transition">
            {t("admin_back_home")}
          </a>
        </p>
      </div>
    </div>
  );
}
