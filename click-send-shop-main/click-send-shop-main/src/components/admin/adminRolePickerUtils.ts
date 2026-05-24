import type { RbacRoleRow } from "@/services/admin/rbacService";

const PRIVILEGED_ROLE_CODES = new Set(["super_admin", "admin_manager"]);

export function getDefaultAdminRoleIds(roles: RbacRoleRow[], isSuperAdminViewer: boolean) {
  const fallback = roles.find((role) => role.code === "customer_service")
    || roles.find((role) => isSuperAdminViewer || !PRIVILEGED_ROLE_CODES.has(role.code))
    || roles[0];
  return fallback ? [fallback.id] : [];
}
