import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api';
import { Logo } from '@/components/asuka/Logo';
import { LanguageSwitcher } from '@/components/asuka/LanguageSwitcher';
import { ThemeToggle } from '@/components/asuka/ThemeToggle';
import { useLang } from '@/i18n/LanguageProvider';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

interface ResetPasswordSearch {
  token?: string;
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: search.token as string | undefined,
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLang();
  const search = useSearch({ from: Route.id });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (!search.token) {
      toast.error(t('reset_token_missing'));
      navigate({ to: '/auth/forgot-password' });
    }
  }, [search.token, navigate]);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password)) strength += 12;
    if (/[A-Z]/.test(password)) strength += 12;
    if (/[0-9]/.test(password)) strength += 13;
    if (/[!@#$%^&*]/.test(password)) strength += 13;
    setPasswordStrength(Math.min(strength, 100));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    calculatePasswordStrength(value);
  };

  const strengthColor = passwordStrength < 40 ? 'bg-destructive' : passwordStrength < 70 ? 'bg-yellow-500' : 'bg-success';
  const strengthText = passwordStrength < 40 ? t('reset_strength_weak') : passwordStrength < 70 ? t('reset_strength_medium') : t('reset_strength_strong');
  const strengthTextColor = passwordStrength < 40 ? 'text-destructive' : passwordStrength < 70 ? 'text-yellow-500' : 'text-success';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { toast.error(t('reset_fill_all')); return; }
    if (newPassword.length < 8) { toast.error(t('reset_min_8')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('reset_mismatch')); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: search.token, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error?.message || data.message || t('error_occurred'));
        if (data.error?.code === 'TOKEN_EXPIRED') {
          setTimeout(() => navigate({ to: '/auth/forgot-password' }), 2000);
        }
        return;
      }
      toast.success(t('reset_success'));
      setTimeout(() => navigate({ to: '/auth?mode=signin' }), 3000);
    } catch {
      toast.error(t('network_error'));
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const canSubmit = !loading && newPassword.length >= 8 && passwordsMatch;

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

      <Card className="relative w-full max-w-md p-8 glass border-border/50 shadow-glow mt-12">
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground text-center">{t('reset_title')}</h1>
          <p className="text-muted-foreground text-center text-sm mt-1">{t('reset_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nouveau mot de passe */}
          <div>
            <Label htmlFor="new-password">{t('reset_new_pwd')}</Label>
            <div className="relative mt-1">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('reset_new_pwd_placeholder')}
                value={newPassword}
                onChange={handlePasswordChange}
                disabled={loading}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('reset_strength')}</span>
                  <span className={`text-xs font-semibold ${strengthTextColor}`}>{strengthText}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${strengthColor} transition-all duration-300`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('reset_criteria_1')}<br />
                  {t('reset_criteria_2')}<br />
                  {t('reset_criteria_3')}
                </p>
              </div>
            )}
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <Label htmlFor="confirm-password">{t('reset_confirm_pwd')}</Label>
            <div className="relative mt-1">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder={t('reset_confirm_placeholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                disabled={loading}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1.5 text-xs text-destructive">{t('reset_mismatch')}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-gradient-hero border-0"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('reset_submitting')}</>
            ) : t('reset_submit')}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>
            {t('reset_remember')}{' '}
            <button
              onClick={() => navigate({ to: '/auth?mode=signin' })}
              className="text-primary hover:underline font-medium"
            >
              {t('forgot_back_signin')}
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate({ to: '/' })}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="h-3 w-3" /> Asuka One
          </button>
        </div>
      </Card>
    </div>
  );
}
