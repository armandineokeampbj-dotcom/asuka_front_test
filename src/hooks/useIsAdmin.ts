import { useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";

export function useIsAdmin() {
  const { user, isAuthenticated, loading } = useAuth();

  const isAdmin = useMemo(
    () => isAuthenticated && user?.role === "admin",
    [isAuthenticated, user?.role]
  );

  return { isAdmin, loading };
}
