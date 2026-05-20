import type { Product } from "@/types/product";

export const RESTRICTED_KEYWORDS = [
  "tobacco", "cigarette", "cigar", "smoking", "vape", "e-cigarette", "nicotine",
  "alcohol", "liquor", "wine", "beer", "areca", "betel",
  "槟榔", "烟", "香烟", "真烟", "电子烟", "尼古丁", "酒", "白酒", "啤酒", "红酒",
];

function containsRestricted(value: unknown): boolean {
  const text = String(value || "").toLowerCase();
  if (!text) return false;
  return RESTRICTED_KEYWORDS.some((word) => text.includes(word.toLowerCase()));
}

export function isRestrictedProduct(product?: Partial<Product> | null): boolean {
  if (!product) return false;
  if ((product as { is_age_restricted?: boolean }).is_age_restricted === true) return true;
  const complianceType = String((product as { compliance_type?: string }).compliance_type || "").trim().toLowerCase();
  if (complianceType && complianceType !== "normal") return true;

  const fields = [
    (product as { name?: string }).name,
    (product as { description?: string }).description,
    (product as { category_name?: string }).category_name,
    (product as { category?: { name?: string } }).category?.name,
    (product as { attributes?: unknown }).attributes ? JSON.stringify((product as { attributes?: unknown }).attributes) : "",
  ];
  const tags = ((product as { tags?: Array<{ name?: string }> }).tags || []).map((t) => t?.name || "");
  return [...fields, ...tags].some(containsRestricted);
}
