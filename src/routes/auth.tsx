import { createFileRoute, Link, useNavigate, useSearch, Outlet, useLocation } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { Logo } from "@/components/asuka/Logo";
import { LanguageSwitcher } from "@/components/asuka/LanguageSwitcher";
import { ThemeToggle } from "@/components/asuka/ThemeToggle";
import { CountryPhoneSelector, type Country } from "@/components/asuka/CountryPhoneSelector";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (search: Record<string, any>) => ({
    mode: (search.mode as "signin" | "signup") || "signin",
  }),
});

function AuthPage() {
  const { t } = useLang();
  const { user, loading, signup, signin } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ from: "/auth" });
  
  // Vérifier si on est sur une sous-route (validate-email ou check-email)
  const isSubRoute = location.pathname !== "/auth";
  const [mode, setMode] = useState<"signin" | "signup">(searchParams.mode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [busy, setBusy] = useState(false);
  const [signinError, setSigninError] = useState<string | null>(null);

  // Synchroniser le mode avec les paramètres de recherche
  useEffect(() => {
    setMode(searchParams.mode || "signin");
  }, [searchParams.mode]);

  useEffect(() => {
    if (!loading && user && !isSubRoute) nav({ to: "/dashboard" });
  }, [user, loading, nav, isSubRoute]);
  
  // Si on est sur une sous-route, afficher le contenu de la sous-route
  if (isSubRoute) {
    return <Outlet />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSigninError(null);
    try {
      if (mode === "signup") {
        // Construire le numéro de téléphone complet avec le code pays
        const fullPhone = selectedCountry && phone 
          ? `${selectedCountry.dialCode}${phone.replace(/\s+/g, '')}`
          : phone;
        
        await signup(email, password, fullName, fullPhone);
        // Après signup réussi, l'utilisateur verra un message pour vérifier son email
        nav({ to: "/auth/check-email?email=" + encodeURIComponent(email) });
      } else if (mode === "signin") {
        const { user: signedInUser } = await signin(email, password);
        toast.success(t("auth_signin_success") || "Connexion réussie");
        if (signedInUser.adminRole) {
          nav({ to: "/admin/dashboard" });
        } else if (!signedInUser.onboarded) {
          nav({ to: "/onboarding" });
        } else {
          nav({ to: "/dashboard" });
        }
      }
    } catch (err: any) {
      if (mode === "signin") {
        setSigninError(err.message || "Identifiants incorrects");
        toast.error(err.message || "Erreur");
      } else {
        toast.error(err.message || "Erreur");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-gradient-aurora pointer-events-none" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
      <Card className="relative w-full max-w-md p-8 glass border-border/50 shadow-glow">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? t("auth_signin_title") : t("auth_signup_title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtagline")}</p>

        <div className="mt-6 space-y-4">
          <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <>
                <div>
                  <Label htmlFor="name">{t("auth_full_name")}</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <CountryPhoneSelector
                    selectedCountry={selectedCountry}
                    phone={phone}
                    onCountryChange={setSelectedCountry}
                    onPhoneChange={setPhone}
                    label={t("auth_phone") || "Numéro de téléphone"}
                    placeholder="XX XX XX XX"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("auth_phone_hint") || "Optionnel"}</p>
                </div>
                </>
              )}
              <div>
                <Label htmlFor="email">{t("auth_email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pw">{t("auth_password")}</Label>
                <Input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1"
                />
              </div>

              {/* Afficher le lien de mot de passe oublié en cas d'erreur */}
              {mode === "signin" && signinError && (
                <div className="text-center">
                  <p className="text-xs text-red-500 mb-2">{signinError}</p>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {t("auth_forgot_password")}
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 bg-gradient-hero shadow-glow border-0"
              >
                {mode === "signup" ? t("auth_signup_btn") : t("auth_signin_btn")}
              </Button>
            </form>

            <button
              onClick={() => { 
                const newMode = mode === "signin" ? "signup" : "signin";
                nav({ to: "/auth", search: { mode: newMode } });
                setEmail(""); 
                setPassword(""); 
                setFullName(""); 
                setPhone(""); 
                setSelectedCountry(null);
                setSigninError(null); 
              }}
              className="mt-5 text-sm text-muted-foreground hover:text-foreground w-full text-center"
            >
              {mode === "signin" ? t("auth_to_signup") : t("auth_to_signin")}
            </button>
          </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Asuka One
          </Link>
        </div>
      </Card>
    </div>
  );
}
