import { useMemo, useState } from "react";
import type { RbacRoleRow } from "@/services/admin/rbacService";
import { labelRbacRoleCode } from "@/utils/adminDisplayLabels";
import SearchBar from "@/components/SearchBar";

type AdminRolePickerProps = {
  roles: RbacRoleRow[];
  selectedRoleIds: number[];
  onChange: (roleIds: number[]) => void;
  isSuperAdminViewer: boolean;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
};

export default function AdminRolePicker({
  roles,
  selectedRoleIds,
  onChange,
  isSuperAdminViewer,
  disabled = false,
  className = "",
  emptyText = "暂无可分配角色",
  showSearch = true,
  searchPlaceholder = "搜索角色名称或编码...",
}: AdminRolePickerProps) {
  const [search, setSearch] = useState("");
  const selected = new Set(selectedRoleIds);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (role) => role.name.toLowerCase().includes(q) || role.code.toLowerCase().includes(q),
    );
  }, [roles, search]);

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
    <div className={`space-y-2 ${className}`}>
      {showSearch ? (
        <SearchBar placeholder={searchPlaceholder} value={search} onChange={setSearch} />
      ) : null}
      {filteredRoles.length === 0 ? (
        <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
          没有匹配的角色
        </p>
      ) : (
        <div className="grid max-h-[min(40vh,320px)] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredRoles.map((role) => {
            const locked = !isSuperAdminViewer && PRIVILEGED_ROLE_CODES.has(role.code);
            const checked = selected.has(role.id);
            const codeLabel = labelRbacRoleCode(role.code);
            const subtitle = codeLabel !== role.name ? codeLabel : "";
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
                  {subtitle ? (
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {subtitle}
                    </span>
                  ) : null}
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
      )}
    </div>
  );
}
