import type { RecycleBinItem } from "@/api/admin/recycleBin";
import { labelRecycleType } from "@/utils/adminDisplayLabels";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FALLBACK_NAME_BY_TYPE: Record<string, string> = {
  products: "未命名商品",
  categories: "未命名分类",
  coupons: "未命名优惠券",
  banners: "未命名轮播图",
  content_pages: "未命名内容页",
  product_reviews: "无文字评论",
  marketing_activities: "未命名营销活动",
  product_tags: "未命名标签",
  notifications: "未命名通知",
  notification_batches: "未命名通知批次",
  product_variants: "未命名规格",
  product_spec_groups: "未命名规格组",
  product_spec_values: "未命名规格值",
  inventory_pack_rules: "未命名组装规则",
  users: "未命名用户",
};

function isUuidLike(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (UUID_RE.test(trimmed)) return true;
  return /^[0-9a-f-]{24,}$/i.test(trimmed.replace(/\s/g, ""));
}

function isReadableRecycleName(name: string, id: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed === id) return false;
  if (isUuidLike(trimmed)) return false;
  return true;
}

export function formatRecycleBinItemName(item: Pick<RecycleBinItem, "id" | "name" | "type" | "type_label">): string {
  const id = String(item.id || "").trim();
  const rawName = String(item.name || "").trim();
  if (isReadableRecycleName(rawName, id)) return rawName;
  return FALLBACK_NAME_BY_TYPE[item.type] || labelRecycleType(item.type, item.type_label) || "已删除项";
}

export function formatRecycleBinItemFullText(
  item: Pick<RecycleBinItem, "id" | "name" | "type" | "type_label" | "slug" | "product_id">,
): string {
  const display = formatRecycleBinItemName(item);
  const lines = [display];
  const rawName = String(item.name || "").trim();
  if (rawName && rawName !== display && isReadableRecycleName(rawName, item.id)) {
    lines.push(`原始名称：${rawName}`);
  }
  if (item.slug) lines.push(`路径：${item.slug}`);
  if (item.product_id) lines.push(`商品 ID：${item.product_id}`);
  lines.push(`记录 ID：${item.id}`);
  return lines.join("\n");
}
