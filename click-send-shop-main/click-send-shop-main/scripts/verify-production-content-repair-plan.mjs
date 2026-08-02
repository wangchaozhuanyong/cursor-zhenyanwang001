import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const planPath = path.resolve(
  process.cwd(),
  process.env.PRODUCTION_CONTENT_PLAN || "docs/production-content-repair-plan.json",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

const plan = JSON.parse(await readFile(planPath, "utf8"));
const summary = plan?.summary || {};
const details = plan?.details || {};
const navItems = Array.isArray(details.invalidHomeNavItems) ? details.invalidHomeNavItems : [];
const externalNavItems = Array.isArray(details.externalHomeNavItems) ? details.externalHomeNavItems : [];
const productItems = Array.isArray(details.productsWithoutEffectiveImage)
  ? details.productsWithoutEffectiveImage
  : [];
const bannerItems = Array.isArray(details.bannerTitlesWithoutResponsiveMedia)
  ? details.bannerTitlesWithoutResponsiveMedia
  : [];
const fallbackBannerItems = Array.isArray(details.bannerTitlesUsingFixedResponsiveFallback)
  ? details.bannerTitlesUsingFixedResponsiveFallback
  : [];
const effectiveBannerBlockers = Array.isArray(details.bannerTitlesWithoutEffectiveResponsiveMedia)
  ? details.bannerTitlesWithoutEffectiveResponsiveMedia
  : [];
const categoryBannerItems = Array.isArray(details.categoriesWithoutCustomBanner)
  ? details.categoriesWithoutCustomBanner
  : [];
const complianceItems = Array.isArray(details.complianceBlockers)
  ? details.complianceBlockers
  : [];

assert(/^https:\/\//.test(String(plan.baseUrl || "")), "baseUrl must be an HTTPS storefront URL");
assert(Number.isFinite(Date.parse(plan.checkedAt)), "checkedAt must be an ISO date");
assert(summary.bannersWithoutResponsiveMedia === bannerItems.length, "banner count does not match details");
assert(summary.bannersUsingFixedResponsiveFallback === fallbackBannerItems.length, "fallback banner count does not match details");
assert(summary.bannersWithoutEffectiveResponsiveMedia === effectiveBannerBlockers.length, "effective banner blocker count does not match details");
assert(summary.categoriesWithoutCustomBanner === categoryBannerItems.length, "category banner count does not match details");
assert(summary.invalidHomeNavItems === navItems.length, "invalid navigation count does not match details");
assert(summary.externalHomeNavItemsToReview === externalNavItems.length, "external navigation count does not match details");
assert(summary.homeProductsWithoutEffectiveImage === productItems.length, "missing product media count does not match details");
assert(summary.complianceBlockers === complianceItems.length, "compliance blocker count does not match details");

const expectedBlockers = effectiveBannerBlockers.length + navItems.length + productItems.length + complianceItems.length;
assert(summary.blockerCount === expectedBlockers, "blockerCount does not match detailed blockers");
assert(plan.status === (expectedBlockers > 0 ? "not_ready" : "ready"), "status does not match blockerCount");

for (const item of navItems) {
  assert(isUuid(item.id), `navigation item ${item.title || "(untitled)"} is missing a valid id`);
  assert(
    item.suggestedAction === "set_category" || item.suggestedAction === "disable_until_supported",
    `navigation item ${item.title || item.id} has no supported repair action`,
  );
  if (item.suggestedAction === "set_category") {
    assert(isUuid(item.suggestedTargetCategoryId), `navigation item ${item.title || item.id} has no target category`);
    assert(
      item.suggestedLinkUrl === `/categories?cat=${item.suggestedTargetCategoryId}`,
      `navigation item ${item.title || item.id} has an inconsistent category URL`,
    );
  }
}

for (const item of externalNavItems) {
  assert(isUuid(item.id), `external navigation item ${item.title || "(untitled)"} is missing a valid id`);
  assert(/^https:\/\//.test(String(item.linkUrl || "")), `external navigation item ${item.title || item.id} has no HTTPS URL`);
  assert(Boolean(item.suggestedAction), `external navigation item ${item.title || item.id} has no review action`);
}

for (const item of complianceItems) {
  assert(
    item.issue === "age_gate_disabled_with_restricted_catalog",
    "compliance blocker has an unsupported issue",
  );
  assert(
    item.suggestedAction === "enable_site_age_gate",
    "compliance blocker has no supported repair action",
  );
  assert(
    Array.isArray(item.restrictedCategories) && item.restrictedCategories.length > 0,
    "compliance blocker has no restricted categories",
  );
  assert(
    Number.isInteger(item.minimumAge) && item.minimumAge > 0,
    "compliance blocker has an invalid minimum age",
  );
}

const productIds = new Set();
for (const item of productItems) {
  assert(isUuid(item.id), `product ${item.name || "(unnamed)"} is missing a valid id`);
  assert(!productIds.has(item.id), `product ${item.id} appears more than once`);
  productIds.add(item.id);
  assert(Boolean(String(item.name || "").trim()), `product ${item.id} is missing a name`);
  assert(["P0", "P1", "P2"].includes(item.priority), `product ${item.name} has an invalid priority`);
  assert(Array.isArray(item.occurrences) && item.occurrences.length > 0, `product ${item.name} has no storefront occurrence`);
  assert(
    item.requiredAction === "upload_square_product_cover_or_default_variant_image",
    `product ${item.name} has no supported media repair action`,
  );
}

console.log(
  `[verify:production-content-plan] ok (${expectedBlockers} blockers, ${externalNavItems.length} review item(s))`,
);
