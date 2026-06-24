import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  language: "fr" | "en";
  isVerified: boolean;
  isEmailVerified: boolean;
  role: "user" | "admin_super" | "admin_b" | "collaborator_c";
  onboarded: boolean;
  // Admin fields — extracted from JWT
  adminRole?: "super_admin" | "admin_b" | "collaborator_c" | null;
  permissions?: "editor" | "reader" | null;
  parentAdminId?: string | null;
  adminProfileId?: string | null;
  // First-login flags
  mustChangePassword?: boolean;
  mustCompleteProfile?: boolean;
  // Dual-space flag
  hasUserProfile?: boolean;
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
  updateUserFlags: (flags: Partial<Pick<User, "mustChangePassword" | "mustCompleteProfile">>) => void;
  updateUser: (partial: Partial<User>) => void;
  signOut: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TOKEN_KEY = "asuka_token";
const USER_KEY = "asuka_user";

function decodeJWTPayload(token: string): Record<string, any> {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

function mergeAdminFields(userData: User, token: string): User {
  const payload = decodeJWTPayload(token);
  return {
    ...userData,
    adminRole: payload.adminRole ?? null,
    permissions: payload.permissions ?? null,
    parentAdminId: payload.parentAdminId ?? null,
    adminProfileId: payload.adminProfileId ?? null,
    // userData (source DB / réponse API fraîche) prend la priorité sur le JWT pour les flags first-login.
    // Le JWT peut être un vieux token dont les flags ont déjà été effacés en base.
    mustChangePassword: userData.mustChangePassword ?? payload.mustChangePassword ?? false,
    mustCompleteProfile: userData.mustCompleteProfile ?? payload.mustCompleteProfile ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.ok) {
            const data = await response.json();
            const userWithAdmin = mergeAdminFields(data.user, storedToken);
            setToken(storedToken);
            setUser(userWithAdmin);
          } else {
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
      const userWithAdmin = mergeAdminFields(userData, newToken);

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userWithAdmin));
      setToken(newToken);
      setUser(userWithAdmin);

      return { token: newToken, user: userWithAdmin };
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
      const userWithAdmin = mergeAdminFields(userData, newToken);

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userWithAdmin));
      setToken(newToken);
      setUser(userWithAdmin);

      return { token: newToken, user: userWithAdmin };
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

  const setAuthData = (token: string, user: User) => {
    const userWithAdmin = mergeAdminFields(user, token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userWithAdmin));
    setToken(token);
    setUser(userWithAdmin);
    setError(null);
  };

  const updateUserFlags = (flags: Partial<Pick<User, "mustChangePassword" | "mustCompleteProfile">>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...flags };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setError(null);

    if (token) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      signup,
      signin,
      verifyOTP,
      resendOTP,
      setAuthData,
      updateUserFlags,
      updateUser,
      signOut,
      error,
    }),
    [user, token, loading, signup, signin, verifyOTP, resendOTP, setAuthData, updateUserFlags, updateUser, signOut, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
