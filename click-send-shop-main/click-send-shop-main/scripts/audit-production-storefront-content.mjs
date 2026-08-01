import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const baseUrlArg = args.find((arg) => !arg.startsWith("--"));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.slice("--output=".length).trim() : "";
const baseUrl = String(baseUrlArg || process.env.CONTENT_BASE_URL || "").replace(/\/+$/, "");

if (!baseUrl) {
  console.error(
    "Usage: npm run audit:production-content -- https://example.com [--strict] [--output=docs/report.json]",
  );
  process.exit(1);
}

async function fetchData(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}`);
  const body = await response.json();
  if (body?.code !== 0 || body?.data === undefined) {
    throw new Error(`${pathname} returned an unexpected API envelope`);
  }
  return body.data;
}

function flattenCategories(categories) {
  const flattened = [];
  const visit = (items) => {
    for (const item of Array.isArray(items) ? items : []) {
      flattened.push(item);
      visit(item.children);
    }
  };
  visit(categories);
  return flattened;
}

function hasEffectiveProductImage(product) {
  return [
    product?.cover_image,
    product?.image_url,
    product?.default_variant?.image_url,
  ].some((value) => Boolean(String(value || "").trim()));
}

function navTargetCategoryId(item) {
  const configured = String(item?.target_category_id || "").trim();
  if (configured) return configured;
  try {
    const link = String(item?.link_url || "").trim();
    if (!link) return "";
    return new URL(link, baseUrl).searchParams.get("cat") || "";
  } catch {
    return "";
  }
}

const CATEGORY_NAME_ALIASES = new Map([
  ["签证办理", "签证服务"],
]);
const RESTRICTED_CATEGORY_KEYWORDS = [
  "tobacco", "cigarette", "cigar", "smoking", "vape", "e-cigarette", "nicotine",
  "alcohol", "liquor", "wine", "beer", "areca", "betel",
  "槟榔", "烟", "香烟", "真烟", "电子烟", "尼古丁", "酒", "白酒", "啤酒", "红酒",
];

function suggestedCategoryForNav(item, categories) {
  const title = String(item?.title || "").trim();
  const expectedName = CATEGORY_NAME_ALIASES.get(title) || title;
  return categories.find((category) => String(category?.name || "").trim() === expectedName);
}

function isRestrictedCategory(category) {
  const text = `${String(category?.name || "")} ${String(category?.description || "")}`.toLowerCase();
  return RESTRICTED_CATEGORY_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

function buildProductOccurrences(productGroups) {
  const occurrences = new Map();
  for (const [groupName, products] of productGroups) {
    for (const [index, product] of products.entries()) {
      const id = String(product?.id || "");
      if (!id) continue;
      const current = occurrences.get(id) || [];
      current.push({ group: groupName, position: index + 1 });
      occurrences.set(id, current);
    }
  }
  return occurrences;
}

function productMediaPriority(occurrences) {
  if (occurrences.some(({ group, position }) => group === "hot" && position <= 8)) return "P0";
  if (
    occurrences.some(({ group, position }) => (
      (group === "hot" && position <= 16)
      || (group === "recommended" && position <= 8)
      || group === "new_arrivals"
    ))
  ) {
    return "P1";
  }
  return "P2";
}

const [banners, categories, bootstrap] = await Promise.all([
  fetchData("/api/banners"),
  fetchData("/api/categories"),
  fetchData("/api/home/bootstrap"),
]);

const allCategories = flattenCategories(categories);
const categoriesById = new Map(allCategories.map((category) => [String(category.id), category]));
const activeBanners = (Array.isArray(banners) ? banners : []).filter((banner) => banner?.enabled !== false);
const bannersWithoutResponsiveMedia = activeBanners.filter((banner) => (
  !String(banner?.image_mobile || "").trim()
  || !String(banner?.image_desktop || "").trim()
));
const categoriesWithoutCustomBanner = allCategories.filter((category) => (
  category?.is_visible !== false
  && (!category?.banner_enabled || !String(category?.banner_image_url || "").trim())
));

const enabledNavItems = (bootstrap?.homeOps?.navItems || []).filter((item) => item?.enabled !== false);
const invalidNavItems = [];
for (const item of enabledNavItems) {
  const targetType = String(item?.target_type || "url");
  const link = String(item?.link_url || "").trim();
  if (targetType === "category") {
    const targetCategoryId = navTargetCategoryId(item);
    if (!targetCategoryId) {
      invalidNavItems.push({ title: item.title, reason: "missing_category_target" });
    } else if (!categoriesById.has(targetCategoryId)) {
      invalidNavItems.push({
        title: item.title,
        reason: "unknown_category_target",
        targetCategoryId,
      });
    }
    continue;
  }
  if (targetType === "url" && !link) {
    invalidNavItems.push({ title: item.title, reason: "missing_url" });
  }
}

const externalHomeNavItems = enabledNavItems
  .filter((item) => String(item?.target_type || "url") === "url")
  .map((item) => {
    const link = String(item?.link_url || "").trim();
    if (!link) return null;
    try {
      const resolved = new URL(link, baseUrl);
      if (resolved.origin === new URL(baseUrl).origin) return null;
      return {
        id: item.id,
        title: item.title,
        linkUrl: link,
        suggestedAction: item.title === "邀请返现" ? "review_internal_invite_route" : "review_external_domain",
        suggestedLinkUrl: item.title === "邀请返现" ? "/invite" : undefined,
      };
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const productGroupEntries = bootstrap?.products && typeof bootstrap.products === "object"
  ? Object.entries(bootstrap.products).map(([name, products]) => [
    name,
    Array.isArray(products) ? products : [],
  ])
  : [];
const productGroups = productGroupEntries.map(([, products]) => products);
const productOccurrences = buildProductOccurrences(productGroupEntries);
const uniqueProducts = [
  ...new Map(
    productGroups
      .flatMap((group) => (Array.isArray(group) ? group : []))
      .map((product) => [String(product.id), product]),
  ).values(),
];
const productsWithoutImages = uniqueProducts.filter((product) => !hasEffectiveProductImage(product));
const restrictedCategories = allCategories.filter((category) => (
  category?.is_visible !== false && isRestrictedCategory(category)
));
const ageGateEnabled = String(bootstrap?.siteInfo?.ageGateEnabled || "").trim() === "1";
const complianceBlockers = restrictedCategories.length > 0 && !ageGateEnabled
  ? [{
      issue: "age_gate_disabled_with_restricted_catalog",
      restrictedCategories: restrictedCategories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      minimumAge: Math.max(1, Number(bootstrap?.siteInfo?.minimumAge) || 18),
      suggestedAction: "enable_site_age_gate",
    }]
  : [];

const blockerCount = bannersWithoutResponsiveMedia.length
  + invalidNavItems.length
  + productsWithoutImages.length
  + complianceBlockers.length;
const report = {
  baseUrl,
  checkedAt: new Date().toISOString(),
  status: blockerCount > 0 ? "not_ready" : "ready",
  summary: {
    activeBanners: activeBanners.length,
    bannersWithoutResponsiveMedia: bannersWithoutResponsiveMedia.length,
    visibleCategories: allCategories.filter((category) => category?.is_visible !== false).length,
    categoriesWithoutCustomBanner: categoriesWithoutCustomBanner.length,
    enabledHomeNavItems: enabledNavItems.length,
    invalidHomeNavItems: invalidNavItems.length,
    externalHomeNavItemsToReview: externalHomeNavItems.length,
    homeProducts: uniqueProducts.length,
    homeProductsWithoutEffectiveImage: productsWithoutImages.length,
    ageGateEnabled,
    restrictedCatalogCategories: restrictedCategories.length,
    complianceBlockers: complianceBlockers.length,
    blockerCount,
  },
  details: {
    bannerTitlesWithoutResponsiveMedia: bannersWithoutResponsiveMedia.map((banner) => banner.title || banner.id),
    categoriesWithoutCustomBanner: categoriesWithoutCustomBanner.map((category) => category.name || category.id),
    invalidHomeNavItems: invalidNavItems.map((item) => {
      const source = enabledNavItems.find((navItem) => navItem.title === item.title);
      const category = suggestedCategoryForNav(source, allCategories);
      if (!category) {
        return {
          ...item,
          id: source?.id,
          suggestedAction: "disable_until_supported",
        };
      }
      return {
        ...item,
        id: source?.id,
        suggestedAction: "set_category",
        suggestedTargetCategoryId: category.id,
        suggestedLinkUrl: `/categories?cat=${category.id}`,
      };
    }),
    externalHomeNavItems,
    complianceBlockers,
    productsWithoutEffectiveImage: productsWithoutImages.map((product) => ({
      id: product.id,
      name: product.name,
      priority: productMediaPriority(productOccurrences.get(String(product.id)) || []),
      occurrences: productOccurrences.get(String(product.id)) || [],
      requiredAction: "upload_square_product_cover_or_default_variant_image",
    })),
  },
};

const serializedReport = `${JSON.stringify(report, null, 2)}\n`;
console.log(serializedReport.trimEnd());
if (outputPath) {
  const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, serializedReport, "utf8");
  console.error(`[audit:production-content] report written to ${absoluteOutputPath}`);
}
if (strict && blockerCount > 0) process.exit(2);
