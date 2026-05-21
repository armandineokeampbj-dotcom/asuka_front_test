import { useAuth } from "@/context/AuthProvider";
import { Navigate } from "@tanstack/react-router";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
}

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/auth" />;
    }

    return <Component {...props} />;
  };
}
