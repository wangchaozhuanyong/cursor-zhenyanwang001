import { Tx } from "@/components/admin/AdminText";
import type { HomeNavItem } from "@/types/content";
import HomeNavSortRow from "./HomeNavSortRow";

type Props = {
  loading: boolean;
  navItems: HomeNavItem[];
  categoryNameMap: Map<string, string>;
  draggingId: string | null;
  savingOrder: boolean;
  setDraggingId: (id: string | null) => void;
  onDrop: (targetId: string) => void | Promise<void>;
  onEdit: (item: HomeNavItem) => void;
  onDelete: (item: HomeNavItem) => void;
  onPositionChange: (itemId: string, position: number) => void | Promise<void>;
};

export default function HomeNavSortableList({
  loading,
  navItems,
  categoryNameMap,
  draggingId,
  savingOrder,
  setDraggingId,
  onDrop,
  onEdit,
  onDelete,
  onPositionChange,
}: Props) {
  const getLinkLabel = (item: HomeNavItem) =>
    item.target_type === "category" && item.target_category_id
      ? `分类：${categoryNameMap.get(item.target_category_id) || item.target_category_id}`
      : item.link_url || "未设置跳转";

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-muted-foreground">
        <Tx>拖拽左侧手柄调整顺序；点击序号可手动指定位置。序号越小越靠前。</Tx>
      </p>

      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <div className="skeleton-base skeleton-shimmer h-4 w-4 rounded" />
              <div className="skeleton-base skeleton-shimmer h-8 w-14 rounded-lg" />
              <div className="skeleton-base skeleton-shimmer h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-base skeleton-shimmer h-4 w-28 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-48 rounded" />
              </div>
            </div>
          ))
        : null}

      {!loading
        && navItems.map((item, index) => (
          <HomeNavSortRow
            key={item.id}
            item={item}
            displayIndex={index + 1}
            linkLabel={getLinkLabel(item)}
            canManage
            savingOrder={savingOrder}
            isDragging={draggingId === item.id}
            onDragStart={() => setDraggingId(item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void onDrop(item.id)}
            onDragEnd={() => setDraggingId(null)}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
            onPositionChange={(position) => onPositionChange(item.id, position)}
          />
        ))}

      {!loading && navItems.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Tx>暂无金刚区导航</Tx>
        </div>
      )}
    </div>
  );
}
