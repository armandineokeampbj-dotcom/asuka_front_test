import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { adminAPI } from "@/lib/api-client";

export function useIsAdmin() {
  const { user, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAuthenticated) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Check if user can access admin endpoints
        // If they can, they're an admin or moderator
        await adminAPI.getAnalytics();
        setIsAdmin(true);
      } catch {
        // Not admin - API call failed due to authorization
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, isAuthenticated]);

  return { isAdmin, loading };
}