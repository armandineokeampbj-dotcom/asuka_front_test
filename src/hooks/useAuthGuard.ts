import { useAuth } from "@/context/AuthProvider";

export function useAuthGuard() {
  const { user, isAuthenticated, loading, token } = useAuth();

  return {
    user,
    isAuthenticated,
    loading,
    token,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.firstName || user?.email,
    isAdmin: user?.role === "admin_super" || user?.role === "admin_b" || user?.role === "collaborator_c",
  };
}

export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && !isAuthenticated) {
    throw new Error("User not authenticated");
  }

  return { isAuthenticated, loading };
}
