import { useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";

const ADMIN_ROLES = ["admin_super", "admin_b", "collaborator_c"];

export function useIsAdmin() {
  const { user, isAuthenticated, loading } = useAuth();

  const isAdmin = useMemo(
    () => isAuthenticated && ADMIN_ROLES.includes(user?.role || ""),
    [isAuthenticated, user?.role]
  );

  return { isAdmin, loading };
}
