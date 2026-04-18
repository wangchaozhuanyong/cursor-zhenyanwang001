import type { ReactNode } from "react";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";

type Props = {
  /** 单一权限码 */
  permission?: string;
  /** 满足其一即可 */
  anyOf?: string[];
  children: ReactNode;
  /** 无权限时渲染内容，默认不渲染 */
  fallback?: ReactNode;
};

/**
 * 前端权限门（体验层）：须与后端 requirePermission 使用同一套 code。
 * 超级管理员始终通过。
 */
export default function PermissionGate({ permission, anyOf, children, fallback = null }: Props) {
  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);

  if (isSuperAdmin) return <>{children}</>;
  if (anyOf?.length) return canAny(anyOf) ? <>{children}</> : <>{fallback}</>;
  if (permission) return can(permission) ? <>{children}</> : <>{fallback}</>;
  return <>{children}</>;
}
