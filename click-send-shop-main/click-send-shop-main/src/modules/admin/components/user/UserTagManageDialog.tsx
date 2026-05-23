import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { productTagBadgeClass } from "@/utils/productTagBadge";
import type { UserTag } from "@/types/user";

const TAG_COLORS = ["红色", "绿色", "蓝色", "金色"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: UserTag[];
  creating?: boolean;
  deletingId?: string | null;
  onCreate: (payload: { name: string; color: string }) => void;
  onDelete: (tag: UserTag) => void;
  onFilterByTag?: (tagId: string) => void;
};

export default function UserTagManageDialog({
  open,
  onOpenChange,
  tags,
  creating = false,
  deletingId = null,
  onCreate,
  onDelete,
  onFilterByTag,
}: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("金色");

  useEffect(() => {
    if (!open) {
      setName("");
      setColor("金色");
    }
  }, [open]);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    onCreate({ name: trimmed, color });
  };

  const footer = (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--theme-border)] px-4 py-2 text-sm font-medium hover:bg-secondary"
    >
      关闭
    </button>
  );

  return (
    <AdminResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="标签管理"
      description="创建用户标签，或删除不再使用的标签。"
      footer={footer}
      size="sm"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">新建标签</p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="标签名称"
              className="min-h-[40px] min-w-[8rem] flex-1 rounded-lg bg-secondary px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="min-h-[40px] rounded-lg bg-secondary px-3 py-2 text-sm"
            >
              {TAG_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={creating || !name.trim()}
              onClick={handleCreate}
              className="min-h-[40px] rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : "创建"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">已有标签</p>
          {tags.length ? (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {tags.map((tag) => (
                <li
                  key={tag.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--theme-border)] px-3 py-2"
                >
                  <button
                    type="button"
                    className={`inline-flex min-w-0 flex-1 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${productTagBadgeClass(tag.color)}`}
                    onClick={() => {
                      onFilterByTag?.(tag.id);
                      onOpenChange(false);
                    }}
                    title={onFilterByTag ? "点击按此标签筛选用户" : undefined}
                  >
                    <span className="truncate">{tag.name}</span>
                    <span className="shrink-0 opacity-70">({tag.count ?? 0})</span>
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === tag.id}
                    onClick={() => onDelete(tag)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-50"
                    aria-label={`删除${tag.name}`}
                  >
                    {deletingId === tag.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">暂无标签</p>
          )}
        </div>
      </div>
    </AdminResponsiveSheet>
  );
}
