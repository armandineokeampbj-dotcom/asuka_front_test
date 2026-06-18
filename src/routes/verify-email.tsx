import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authExtrasAPI } from "@/lib/api-client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/verify-email")({ component: VerifyEmailPage });

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const search = new URLSearchParams(window.location.search);
  const token = search.get("token") ?? "";
  const role = search.get("role") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg(t("verify_token_missing"));
      setStatus("error");
      return;
    }

    authExtrasAPI.verifyAdminEmail(token)
      .then((data) => {
        setEmail(data.email ?? "");
        setStatus("success");
      })
      .catch((err) => {
        const msg = err?.message || t("verify_link_invalid");
        setErrorMsg(msg);
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
        <div className="font-bold text-2xl tracking-tight text-white">ASUKA</div>

        {status === "loading" && (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-zinc-400 text-sm">{t("verify_loading")}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-success" />
            <div>
              <h2 className="text-xl font-semibold text-white">{t("verify_success_title")}</h2>
              {email && <p className="text-zinc-400 text-sm mt-1">{email}</p>}
              <p className="text-zinc-400 text-sm mt-2">
                {t("verify_success_desc")}
              </p>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => role === "admin" ? navigate({ to: "/login-admin" }) : navigate({ to: "/auth/signin" as any })}
            >
              {t("verify_back_admin")}
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-xl font-semibold text-white">{t("verify_error_title")}</h2>
              <p className="text-zinc-400 text-sm mt-2">{errorMsg}</p>
            </div>
            <p className="text-zinc-500 text-xs">
              {t("verify_error_hint")}
            </p>
            {role === "admin" && (
              <Button variant="outline" className="w-full border-zinc-700" onClick={() => navigate({ to: "/login-admin" })}>
                {t("verify_back_admin")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
