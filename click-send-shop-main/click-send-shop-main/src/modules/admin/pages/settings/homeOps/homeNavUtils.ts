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

export type HomeNavRepairSuggestion = {
  label: string;
  description: string;
  payload: Partial<NavForm>;
};

export type HomeNavRepairScope = "" | "invalid";

export function readHomeNavRepairScopeFromSearch(search: string): HomeNavRepairScope {
  const params = new URLSearchParams(search);
  return params.get("repair_scope") === "invalid" ? "invalid" : "";
}

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

const HOME_NAV_CATEGORY_ALIASES: Record<string, string[]> = {
  正品烟草: ["正品烟草"],
  签证办理: ["签证服务", "签证办理"],
  第二家园: ["第二家园"],
  留学办理: ["留学办理", "留学服务"],
};

function normalizeLookupLabel(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function flattenCategoryNodes(nodes: Category[]): Category[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenCategoryNodes((node.children || []).filter(Boolean)),
  ]);
}

export function getHomeNavRepairSuggestion(
  item: HomeNavItem,
  categories: Category[],
  validationIssue?: string | null,
): HomeNavRepairSuggestion | null {
  const title = String(item.title || "").trim();
  const normalizedTitle = normalizeLookupLabel(title);
  const externalUrl = /^https?:\/\//i.test(String(item.link_url || "").trim());

  if (externalUrl && normalizedTitle.includes("邀请")) {
    return {
      label: "改为站内邀请页",
      description: `将「${title}」改为站内 /invite，不再跳出当前网站。`,
      payload: {
        target_type: "url",
        target_category_id: null,
        target_support_channel_id: null,
        link_url: "/invite",
        enabled: true,
      },
    };
  }

  if (!validationIssue) return null;

  const aliases = HOME_NAV_CATEGORY_ALIASES[title] || [title];
  const aliasSet = new Set(aliases.map(normalizeLookupLabel));
  const category = flattenCategoryNodes(categories).find((candidate) => (
    candidate.is_active !== false
    && candidate.is_visible !== false
    && aliasSet.has(normalizeLookupLabel(candidate.name))
  ));

  if (category) {
    return {
      label: `连接到「${category.name}」`,
      description: `将「${title}」改为当前有效分类「${category.name}」。`,
      payload: {
        target_type: "category",
        target_category_id: category.id,
        target_support_channel_id: null,
        link_url: `/categories?cat=${category.id}`,
        enabled: true,
      },
    };
  }

  if (normalizedTitle === "床上用品") {
    return {
      label: "暂时禁用",
      description: "当前没有可用的床上用品分类，先停用入口，避免用户点击后没有内容。",
      payload: { enabled: false },
    };
  }

  return null;
}

export function buildSupportNavLink(channelId: string) {
  return `/support-download?channelId=${encodeURIComponent(channelId)}`;
}

export function isUsableHomeNavUrlTarget(value: string | null | undefined) {
  const target = String(value || "").trim();
  if (!target || target.startsWith("//")) return false;
  if (/^(?:javascript|data|vbscript):/i.test(target)) return false;
  const scheme = target.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  return !scheme || scheme === "http" || scheme === "https";
}

export function getHomeNavValidationIssue(
  item: HomeNavItem,
  options: {
    publicCategoryIds: Set<string>;
    enabledSupportChannelIds: Set<string>;
    supportNavEnabled: boolean;
  },
) {
  if (item.target_type === "categories") return null;
  if (item.target_type === "category") {
    if (!item.target_category_id || !options.publicCategoryIds.has(item.target_category_id)) {
      return "目标分类不存在、已停用或不可见";
    }
    return null;
  }
  if (item.target_type === "support") {
    if (!options.supportNavEnabled) return "客服/APP 页面能力已关闭";
    if (
      !item.target_support_channel_id
      || !options.enabledSupportChannelIds.has(item.target_support_channel_id)
    ) {
      return "客服账号不存在或已禁用";
    }
    return null;
  }
  return isUsableHomeNavUrlTarget(item.link_url) ? null : "跳转地址为空或无效";
}

export function flattenCategories(nodes: Category[], level = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    if (n.is_active === false || n.is_visible === false) continue;
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
