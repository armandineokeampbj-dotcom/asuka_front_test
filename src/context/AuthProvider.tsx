import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  language: "fr" | "en";
  isVerified: boolean;
  isEmailVerified: boolean;
  role: "user" | "admin";
  onboarded: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signup: (email: string, password: string, fullName: string, phone?: string, language?: string) => Promise<{ token: string; user: User }>;
  signin: (email: string, password: string) => Promise<{ token: string; user: User }>;
  verifyOTP: (email: string, otp: string) => Promise<{ token: string; user: User }>;
  resendOTP: (email: string) => Promise<void>;
  setAuthData: (token: string, user: User) => void;
  signOut: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TOKEN_KEY = "asuka_token";
const USER_KEY = "asuka_user";

/**
 * AuthProvider - Handles authentication with backend JWT
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          // Verify token is still valid by fetching user
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.ok) {
            const data = await response.json();
            setToken(storedToken);
            setUser(data.user);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    phone: string = "",
    language: string = "en"
  ): Promise<{ token: string; user: User }> => {
    try {
      setError(null);

      // Step 1: Create account and send OTP
      const signupResponse = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined,
          language,
        }),
      });

      if (!signupResponse.ok) {
        const err = await signupResponse.json();
        const errorMsg = err.error?.message || err.message || "Inscription échouée";
        throw new Error(errorMsg);
      }

      const signupData = await signupResponse.json();

      // User needs to verify OTP - return null to indicate next step
      // Frontend should prompt for OTP
      return {
        token: "",
        user: {
          id: signupData.userId,
          email,
          firstName: fullName.split(" ")[0],
          lastName: fullName.split(" ").slice(1).join(" "),
          language: (language as "fr" | "en") || "en",
          isVerified: false,
          isEmailVerified: false,
          role: "user",
          onboarded: false,
        },
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Inscription échouée";
      setError(errorMsg);
      throw err;
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<{ token: string; user: User }> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/api/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        const err = await response.json();
        const errorMsg = err.error?.message || err.message || "Vérification OTP échouée";
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const { token: newToken, user: userData } = data;

      // Store token and user
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);

      return { token: newToken, user: userData };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Vérification OTP échouée";
      setError(errorMsg);
      throw err;
    }
  };

  const signin = async (email: string, password: string): Promise<{ token: string; user: User }> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 403) {
        // Email not verified - need OTP
        const err = await response.json();
        throw new Error(err.error?.message || "Vérification d'email requise");
      }

      if (!response.ok) {
        const err = await response.json();
        const errorMsg = err.error?.message || err.message || "Connexion échouée";
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const { token: newToken, user: userData } = data;

      // Store token and user
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);

      return { token: newToken, user: userData };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connexion échouée";
      setError(errorMsg);
      throw err;
    }
  };

  const resendOTP = async (email: string): Promise<void> => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const err = await response.json();
        const errorMsg = err.error?.message || err.message || "Erreur lors du renvoi du code OTP";
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors du renvoi du code OTP";
      setError(errorMsg);
      throw err;
    }
  };

  /**
   * Définit les données d'authentification (token et user)
   * Utilisé par les pages de validation d'email pour authentifier l'utilisateur
   */
  const setAuthData = (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(token);
    setUser(user);
    setError(null);
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setError(null);

    // Optional: Call logout endpoint
    if (token) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Ignore errors - user is already logged out locally
      });
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    signup,
    signin,
    verifyOTP,
    resendOTP,
    setAuthData,
    signOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

/**
 * Get the current token for API calls
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Helper to make authenticated API calls
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}