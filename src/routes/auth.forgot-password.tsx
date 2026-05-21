import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/lib/api';
import { Logo } from '@/components/asuka/Logo';
import { LanguageSwitcher } from '@/components/asuka/LanguageSwitcher';

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!emailOrPhone.trim()) {
      toast.error('Veuillez entrer une adresse email ou un numéro de téléphone');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_or_phone: emailOrPhone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Une erreur est survenue');
        return;
      }

      setSubmitted(true);
      toast.success('Si ce compte existe, un email de réinitialisation a été envoyé');

      // Rediriger après 4 secondes
      setTimeout(() => {
        navigate({ to: '/auth?mode=signin' });
      }, 4000);
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 animate-pulse">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Email envoyé !</h2>
            </div>
            
            <p className="text-gray-600 mb-4 font-medium">
              Vérifie ta boîte de réception
            </p>
            
            <p className="text-sm text-gray-500 mb-4">
              Un email de réinitialisation a été envoyé. Clique sur le lien dans l'email pour réinitialiser ton mot de passe.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6 text-xs text-blue-700">
              💡 Le lien reste valide pendant 1 heure
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Redirection vers la connexion dans quelques secondes...
            </p>

            <Button 
              onClick={() => navigate({ to: '/auth?mode=signin' })}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              Retour à la connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              Mot de passe oublié ?
            </h1>
            <p className="text-gray-600 text-center">
              Entrez ton adresse email ou numéro de téléphone pour réinitialiser ton mot de passe
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email-or-phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Email ou Téléphone
              </label>
              <Input
                id="email-or-phone"
                type="text"
                placeholder="exemple@email.com ou +226 XX XX XX XX"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                disabled={loading}
                className="w-full h-11 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Utilise l'email ou le téléphone associé à ton compte
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !emailOrPhone.trim()}
              className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition duration-300 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m10-10h-4m-12 0H2" />
                  </svg>
                  Envoi en cours...
                </span>
              ) : (
                'Envoyer le lien de réinitialisation'
              )}
            </Button>
          </form>

          {/* Liens de navigation */}
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 text-center">
            <p className="text-sm text-gray-600">
              Tu te souviens de ton mot de passe ?{' '}
              <button
                onClick={() => navigate({ to: '/auth?mode=signin' })}
                className="text-purple-600 hover:text-purple-700 font-semibold transition"
              >
                Se connecter
              </button>
            </p>

            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <button
                onClick={() => navigate({ to: '/auth?mode=signup' })}
                className="text-blue-600 hover:text-blue-700 font-semibold transition"
              >
                S'inscrire
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
