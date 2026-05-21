import type { HomeNavItem } from "@/types/content";
import type { Category } from "@/types/category";

export type NavForm = Pick<
  HomeNavItem,
  | "icon_url"
  | "title"
  | "link_url"
  | "sort_order"
  | "enabled"
  | "target_type"
  | "target_category_id"
  | "target_support_channel_id"
>;

export const emptyNavForm: NavForm = {
  icon_url: "",
  title: "",
  link_url: "",
  target_type: "url",
  target_category_id: null,
  target_support_channel_id: null,
  sort_order: 1,
  enabled: true,
};

export function buildSupportNavLink(channelId: string) {
  return `/support-download?channelId=${encodeURIComponent(channelId)}`;
}

export function flattenCategories(nodes: Category[], level = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    out.push({
      id: n.id,
      label: `${"--".repeat(level)}${level > 0 ? " " : ""}${n.icon ? `${n.icon} ` : ""}${n.name}`,
    });
    if (n.children?.length) out.push(...flattenCategories(n.children.filter(Boolean), level + 1));
  }
  return out;
}

/** 按当前顺序写入连续 sort_order（从 1 开始） */
export function applySortIndices(items: HomeNavItem[]): HomeNavItem[] {
  return items.map((item, index) => ({ ...item, sort_order: index + 1 }));
}

export function reorderNavItems(items: HomeNavItem[], fromId: string, toId: string): HomeNavItem[] {
  const fromIdx = items.findIndex((item) => item.id === fromId);
  const toIdx = items.findIndex((item) => item.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return applySortIndices(next);
}

export function moveNavItemToPosition(items: HomeNavItem[], itemId: string, position: number): HomeNavItem[] {
  const fromIdx = items.findIndex((item) => item.id === itemId);
  if (fromIdx < 0) return items;
  const toIdx = Math.max(0, Math.min(items.length - 1, Math.trunc(position) - 1));
  if (fromIdx === toIdx) return applySortIndices(items);
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return applySortIndices(next);
}

export function toSortPayload(items: HomeNavItem[]) {
  return items.map((item) => ({ id: item.id, sort_order: item.sort_order }));
}
