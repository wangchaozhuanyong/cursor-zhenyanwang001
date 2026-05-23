import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { groupAdminPermissions, type AdminPermissionRow } from "@/utils/adminPermissionGroups";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

type AdminPermissionPickerProps = {
  permissions: AdminPermissionRow[];
  selected: Record<number, boolean>;
  onChange: (next: Record<number, boolean>) => void;
  disabled?: boolean;
  className?: string;
};

export default function AdminPermissionPicker({
  permissions,
  selected,
  onChange,
  disabled = false,
  className = "",
}: AdminPermissionPickerProps) {
  const { tText } = useAdminT();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupAdminPermissions(permissions, search), [permissions, search]);

  const togglePerm = (id: number) => {
    if (disabled) return;
    onChange({ ...selected, [id]: !selected[id] });
  };

  const toggleGroup = (groupKey: string, items: AdminPermissionRow[], checked: boolean) => {
    if (disabled) return;
    const next = { ...selected };
    for (const item of items) next[item.id] = checked;
    onChange(next);
  };

  const isGroupCollapsed = (key: string) => collapsed[key] ?? false;

  if (!permissions.length) {
    return <p className="text-xs text-muted-foreground"><Tx>暂无权限数据</Tx></p>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <SearchBar
        placeholder={tText("搜索权限名称或编码...")}
        value={search}
        onChange={setSearch}
      />
      {groups.length === 0 ? (
        <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
          没有匹配的权限
        </p>
      ) : (
        <div className="max-h-[min(52vh,420px)] space-y-2 overflow-y-auto pr-1">
          {groups.map((group) => {
            const allChecked = group.items.every((p) => selected[p.id]);
            const someChecked = group.items.some((p) => selected[p.id]);
            const collapsedGroup = isGroupCollapsed(group.key);
            return (
              <div key={group.key} className="rounded-lg border border-border bg-secondary/20">
                <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [group.key]: !collapsedGroup }))}
                    aria-expanded={!collapsedGroup}
                  >
                    {collapsedGroup ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <span className="flex-1 text-xs font-semibold text-foreground">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground">{group.items.length} 项</span>
                  <button
                    type="button"
                    disabled={disabled}
                    className="rounded border border-border px-2 py-0.5 text-[10px] font-medium hover:bg-secondary disabled:opacity-50"
                    onClick={() => toggleGroup(group.key, group.items, !allChecked)}
                  >
                    {allChecked ? "取消全选" : someChecked ? "全选" : "全选"}
                  </button>
                </div>
                {!collapsedGroup ? (
                  <ul className="grid gap-1 p-2 sm:grid-cols-2">
                    {group.items.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60">
                          <input
                            type="checkbox"
                            checked={!!selected[p.id]}
                            disabled={disabled}
                            onChange={() => togglePerm(p.id)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-border"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-foreground">{p.name}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{p.code}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
