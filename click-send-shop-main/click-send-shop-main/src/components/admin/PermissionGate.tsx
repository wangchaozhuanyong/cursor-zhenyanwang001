import type { ReactNode } from "react";
import { ArrowLeft, Home, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";

type Props = {
  /** 单一权限码 */
  permission?: string;
  /** 满足其一即可 */
  anyOf?: string[];
  children: ReactNode;
  /** 无权限时渲染内容，默认不渲染 */
  fallback?: ReactNode;
  /** 页面级权限门会给出明确无权限提示，按钮/局部操作继续保持隐藏 */
  mode?: "inline" | "page";
};

function AdminPermissionDeniedPanel() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[48vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-6 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <LockKeyhole size={24} aria-hidden />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-[var(--theme-text)]">没有访问权限</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          当前账号没有访问这个后台页面的权限。如需处理该模块，请联系超级管理员调整角色权限。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin", { replace: true })}
            className="inline-flex items-center gap-2 rounded-lg btn-theme-price px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Home size={15} aria-hidden />
            返回后台首页
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]"
          >
            <ArrowLeft size={15} aria-hidden />
            返回上一页
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 前端权限门（体验层）：须与后端 requirePermission 使用同一套 code。
 * 超级管理员始终通过。
 */
export default function PermissionGate({ permission, anyOf, children, fallback, mode = "inline" }: Props) {
  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const resolvedFallback = fallback ?? (mode === "page" ? <AdminPermissionDeniedPanel /> : null);

  if (isSuperAdmin) return <>{children}</>;
  if (anyOf?.length) return canAny(anyOf) ? <>{children}</> : <>{resolvedFallback}</>;
  if (permission) return can(permission) ? <>{children}</> : <>{resolvedFallback}</>;
  return <>{children}</>;
}
