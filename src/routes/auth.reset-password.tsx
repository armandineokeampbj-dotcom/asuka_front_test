import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/lib/api';
import { Logo } from '@/components/asuka/Logo';
import { LanguageSwitcher } from '@/components/asuka/LanguageSwitcher';
import { useLang } from '@/i18n/LanguageProvider';

interface ResetPasswordSearch {
  token?: string;
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => {
    return {
      token: search.token as string | undefined,
    };
  },
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

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return t('reset_strength_weak');
    if (passwordStrength < 70) return t('reset_strength_medium');
    return t('reset_strength_strong');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error(t('reset_fill_all'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('reset_min_8'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('reset_mismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: search.token,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error?.message || data.message || t('error_occurred'));

        if (data.error?.code === 'TOKEN_EXPIRED') {
          setTimeout(() => {
            navigate({ to: '/auth/forgot-password' });
          }, 2000);
        }
        return;
      }

      toast.success(t('reset_success'));

      setTimeout(() => {
        navigate({ to: '/auth?mode=signin' });
      }, 3000);
    } catch (error) {
      toast.error(t('network_error'));
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md mt-12">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-100">
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.08 5.919m7.08-5.919a6 6 0 00-7.08-5.919m7.08 5.919L15 7m-6 8l-2.293-2.293a1 1 0 00-1.414 1.414l.707.707-2.414 2.414a1 1 0 001.414 1.414l2.414-2.414.707.707a1 1 0 001.414-1.414L9 15" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              {t('reset_title')}
            </h1>
            <p className="text-gray-600 text-center text-sm">
              {t('reset_subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('reset_new_pwd')}
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('reset_new_pwd_placeholder')}
                  value={newPassword}
                  onChange={handlePasswordChange}
                  disabled={loading}
                  className="w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M15.171 13.576l1.474 1.474a1 1 0 00.707.293H18a1 1 0 00.707-1.707l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10C1.732 14.057 5.522 17 10 17a9.958 9.958 0 004.512-1.074l1.78 1.781a1 1 0 001.414-1.414l-14-14z" />
                    </svg>
                  )}
                </button>
              </div>

              {newPassword && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">{t('reset_strength')}</span>
                    <span className={`text-xs font-semibold ${
                      passwordStrength < 40 ? 'text-red-600' :
                      passwordStrength < 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {t('reset_criteria_1')}<br />
                    {t('reset_criteria_2')}<br />
                    {t('reset_criteria_3')}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('reset_confirm_pwd')}
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder={t('reset_confirm_placeholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showConfirm ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M15.171 13.576l1.474 1.474a1 1 0 00.707.293H18a1 1 0 00.707-1.707l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10C1.732 14.057 5.522 17 10 17a9.958 9.958 0 004.512-1.074l1.78 1.781a1 1 0 001.414-1.414l-14-14z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-2 text-xs text-red-600">
                  {t('reset_mismatch')}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 rounded-lg transition duration-300"
            >
              {loading ? t('reset_submitting') : t('reset_submit')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t('reset_remember')}{' '}
              <button
                onClick={() => navigate({ to: '/auth?mode=signin' })}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                {t('forgot_back_signin')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
