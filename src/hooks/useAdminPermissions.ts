import { useAuth } from "@/context/AuthProvider";

export function useAdminPermissions() {
  const { user } = useAuth();
  const adminRole = user?.adminRole ?? null;
  const permissions = user?.permissions ?? null;

  return {
    adminRole,
    permissions,
    isSuperAdmin: adminRole === "super_admin",
    isAdminB: adminRole === "admin_b",
    isCollaborator: adminRole === "collaborator_c",
    isEditor: adminRole !== "collaborator_c" || permissions === "editor",
    isReader: adminRole === "collaborator_c" && permissions === "reader",
    canManageAdminsB: adminRole === "super_admin",
    canManageCollaborators: adminRole === "super_admin" || adminRole === "admin_b",
    // Create / edit / duplicate content — editors + admins
    canEdit: adminRole !== "collaborator_c" || permissions === "editor",
    // Approve / reject / change status — admin_b and super_admin only
    canApprove: adminRole === "super_admin" || adminRole === "admin_b",
    // Permanent delete — super_admin only
    canDelete: adminRole === "super_admin",
    hasAnyAdminRole: adminRole !== null,
  };
}
