import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
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
import { KeyRound, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      toast.error(t('forgot_empty_error'));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_or_phone: emailOrPhone.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || t('error_occurred'));
        return;
      }
      setSubmitted(true);
      toast.success(t('forgot_sent_msg'));
      setTimeout(() => navigate({ to: '/auth?mode=signin' }), 4000);
    } catch {
      toast.error(t('network_error'));
    } finally {
      setLoading(false);
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
        {submitted ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-success/15 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-success" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t('forgot_sent_title')}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{t('forgot_sent_inbox')}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t('forgot_sent_desc')}</p>
            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-xs text-muted-foreground">
              {t('forgot_sent_hint')}
            </div>
            <p className="text-xs text-muted-foreground">{t('forgot_redirecting')}</p>
            <Button
              onClick={() => navigate({ to: '/auth?mode=signin' })}
              className="w-full bg-gradient-hero border-0"
            >
              {t('forgot_back_signin')}
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground text-center">{t('forgot_title')}</h1>
              <p className="text-muted-foreground text-center text-sm mt-1">{t('forgot_subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email-or-phone">{t('forgot_label')}</Label>
                <Input
                  id="email-or-phone"
                  type="text"
                  placeholder={t('forgot_placeholder')}
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                  required
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{t('forgot_hint')}</p>
              </div>

              <Button
                type="submit"
                disabled={loading || !emailOrPhone.trim()}
                className="w-full bg-gradient-hero border-0"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('forgot_sending')}</>
                ) : t('forgot_submit')}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border/50 space-y-2 text-center text-sm text-muted-foreground">
              <p>
                {t('forgot_remember')}{' '}
                <button
                  onClick={() => navigate({ to: '/auth?mode=signin' })}
                  className="text-primary hover:underline font-medium"
                >
                  {t('forgot_back_signin')}
                </button>
              </p>
              <p>
                {t('forgot_no_account')}{' '}
                <button
                  onClick={() => navigate({ to: '/auth?mode=signup' })}
                  className="text-primary hover:underline font-medium"
                >
                  {t('forgot_signup')}
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
          </>
        )}
      </Card>
    </div>
  );
}
