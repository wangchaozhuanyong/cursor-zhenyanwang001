import { useEffect, useRef, useState } from "react";
import { ExternalLink, GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import PermissionGate from "@/components/admin/PermissionGate";
import type { HomeNavItem } from "@/types/content";
import { THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_HOVER_TEXT_DANGER } from "@/utils/themeVisuals";
import HomeNavIconPreview from "./HomeNavIconPreview";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  item: HomeNavItem;
  displayIndex: number;
  linkLabel: string;
  canManage: boolean;
  savingOrder: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPositionChange: (position: number) => void | Promise<void>;
};

export default function HomeNavSortRow({
  item,
  displayIndex,
  linkLabel,
  canManage,
  savingOrder,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onDelete,
  onPositionChange,
}: Props) {
  const { tText } = useAdminT();
  const [editingSort, setEditingSort] = useState(false);
  const [sortDraft, setSortDraft] = useState(String(displayIndex));
  const [savingSort, setSavingSort] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingSort) setSortDraft(String(displayIndex));
  }, [displayIndex, editingSort]);

  useEffect(() => {
    if (editingSort) inputRef.current?.focus();
  }, [editingSort]);

  const commitSort = async () => {
    const next = Math.max(1, Math.trunc(Number(sortDraft) || displayIndex));
    setSortDraft(String(next));
    setEditingSort(false);
    if (next === displayIndex) return;
    setSavingSort(true);
    try {
      await onPositionChange(next);
    } finally {
      setSavingSort(false);
    }
  };

  return (
    <div
      draggable={canManage && !savingOrder}
      onDragStart={canManage ? onDragStart : undefined}
      onDragOver={canManage ? onDragOver : undefined}
      onDrop={canManage ? onDrop : undefined}
      onDragEnd={canManage ? onDragEnd : undefined}
      className={`flex items-center gap-2 rounded-xl border border-border bg-background p-3 sm:gap-3 ${
        item.enabled ? "" : "opacity-60"
      } ${isDragging ? "opacity-50" : ""} ${canManage && !savingOrder ? "" : ""} ${savingOrder ? "pointer-events-none" : ""}`}
    >
      {canManage ? (
        <GripVertical
          size={16}
          className={`shrink-0 text-muted-foreground ${savingOrder ? "cursor-wait" : "cursor-grab"}`}
          aria-hidden
        />
      ) : (
        <span className="w-4 shrink-0" aria-hidden />
      )}

      <div className="flex w-14 shrink-0 flex-col items-center gap-0.5">
        {editingSort && canManage ? (
          <input
            ref={inputRef}
            type="number"
            min={1}
            disabled={savingSort || savingOrder}
            className="h-8 w-full rounded-lg border border-gold/40 bg-background px-1 text-center text-sm font-semibold tabular-nums outline-none focus:border-gold"
            value={sortDraft}
            onChange={(e) => setSortDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitSort();
              if (e.key === "Escape") {
                setSortDraft(String(displayIndex));
                setEditingSort(false);
              }
            }}
            onBlur={() => void commitSort()}
          />
        ) : (
          <button
            type="button"
            disabled={!canManage || savingOrder || savingSort}
            onClick={() => canManage && setEditingSort(true)}
            className="flex h-8 min-w-[3rem] items-center justify-center rounded-lg border border-border bg-secondary/60 px-2 text-xs font-semibold tabular-nums text-foreground hover:border-gold/30 hover:bg-gold/5 disabled:cursor-default disabled:opacity-80"
            title={canManage ? "点击修改排序" : undefined}
          >
            {savingSort ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : displayIndex}
          </button>
        )}
        <span className="text-[10px] text-muted-foreground"><Tx>排序</Tx></span>
      </div>

      <HomeNavIconPreview value={item.icon_url} />

      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{item.title}</div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink size={11} className="shrink-0" />
          <AdminTableCell value={linkLabel} fullText={linkLabel} maxWidth="100%" muted />
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
          item.enabled ? THEME_BADGE_SUCCESS : THEME_BADGE_MUTED
        }`}
      >
        {item.enabled ? "启用" : "禁用"}
      </span>

      <PermissionGate permission="home_ops.manage">
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-theme-price"
            onClick={onEdit}
            title={tText("编辑")}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className={`rounded-lg p-2 text-muted-foreground hover:bg-secondary ${THEME_HOVER_TEXT_DANGER}`}
            onClick={onDelete}
            title={tText("删除")}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </PermissionGate>
    </div>
  );
}
