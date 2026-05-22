import type { RbacRoleRow } from "@/services/admin/rbacService";
import { labelRbacRoleCode } from "@/utils/adminDisplayLabels";

const PRIVILEGED_ROLE_CODES = new Set(["super_admin", "admin_manager"]);

type AdminRolePickerProps = {
  roles: RbacRoleRow[];
  selectedRoleIds: number[];
  onChange: (roleIds: number[]) => void;
  isSuperAdminViewer: boolean;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
};

export function getDefaultAdminRoleIds(roles: RbacRoleRow[], isSuperAdminViewer: boolean) {
  const fallback = roles.find((role) => role.code === "customer_service")
    || roles.find((role) => isSuperAdminViewer || !PRIVILEGED_ROLE_CODES.has(role.code))
    || roles[0];
  return fallback ? [fallback.id] : [];
}

export default function AdminRolePicker({
  roles,
  selectedRoleIds,
  onChange,
  isSuperAdminViewer,
  disabled = false,
  className = "",
  emptyText = "暂无可分配角色",
}: AdminRolePickerProps) {
  const selected = new Set(selectedRoleIds);

  const toggleRole = (role: RbacRoleRow) => {
    if (disabled) return;
    if (!isSuperAdminViewer && PRIVILEGED_ROLE_CODES.has(role.code)) return;
    const next = new Set(selected);
    if (next.has(role.id)) next.delete(role.id);
    else next.add(role.id);
    onChange([...next]);
  };

  if (!roles.length) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${className}`}>
      {roles.map((role) => {
        const locked = !isSuperAdminViewer && PRIVILEGED_ROLE_CODES.has(role.code);
        const checked = selected.has(role.id);
        return (
          <label
            key={role.id}
            className={`flex min-h-[52px] items-start gap-2 rounded-lg border border-border bg-[var(--theme-bg)] px-3 py-2 text-sm transition ${
              disabled || locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[var(--theme-price)]/60"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled || locked}
              onChange={() => toggleRole(role)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground">{role.name}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {labelRbacRoleCode(role.code)}
              </span>
              {locked ? (
                <span className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  仅超级管理员可分配
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
