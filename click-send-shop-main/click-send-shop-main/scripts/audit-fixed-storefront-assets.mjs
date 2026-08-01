import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const publicRoot = path.resolve(process.cwd(), "public");
const specs = [
  ["首页移动端主图", "assets/fixed-storefront/option2-home-hero-mobile.webp", 1472, 800, 300 * 1024],
  ["首页桌面端主图", "assets/fixed-storefront/option2-home-hero-desktop.webp", 1600, 600, 300 * 1024],
  ["客服轮播移动端", "assets/fixed-storefront/home-banner-01-customer-support-mobile.webp", 1472, 800, 200 * 1024],
  ["客服轮播桌面端", "assets/fixed-storefront/home-banner-01-customer-support-desktop.webp", 1600, 600, 200 * 1024],
  ["会员轮播移动端", "assets/fixed-storefront/home-banner-02-membership-benefits-mobile.webp", 1472, 800, 200 * 1024],
  ["会员轮播桌面端", "assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp", 1600, 600, 200 * 1024],
  ["优惠券轮播移动端", "assets/fixed-storefront/home-banner-03-coupon-activity-mobile.webp", 1472, 800, 200 * 1024],
  ["优惠券轮播桌面端", "assets/fixed-storefront/home-banner-03-coupon-activity-desktop.webp", 1600, 600, 200 * 1024],
  ["配送轮播移动端", "assets/fixed-storefront/home-banner-04-delivery-arrangement-mobile.webp", 1472, 800, 200 * 1024],
  ["配送轮播桌面端", "assets/fixed-storefront/home-banner-04-delivery-arrangement-desktop.webp", 1600, 600, 200 * 1024],
  ["现货轮播移动端", "assets/fixed-storefront/home-banner-05-local-stock-mobile.webp", 1472, 800, 200 * 1024],
  ["现货轮播桌面端", "assets/fixed-storefront/home-banner-05-local-stock-desktop.webp", 1600, 600, 200 * 1024],
  ["优选采购轮播移动端", "assets/fixed-storefront/home-banner-06-china-selection-mobile.webp", 1472, 800, 200 * 1024],
  ["优选采购轮播桌面端", "assets/fixed-storefront/home-banner-06-china-selection-desktop.webp", 1600, 600, 200 * 1024],
  ["礼品轮播移动端", "assets/fixed-storefront/home-banner-07-gift-selection-mobile.webp", 1472, 800, 200 * 1024],
  ["礼品轮播桌面端", "assets/fixed-storefront/home-banner-07-gift-selection-desktop.webp", 1600, 600, 200 * 1024],
  ["活动主图", "assets/fixed-storefront/promotions-hero.webp", 1200, 525, 300 * 1024],
  ["签证分类主图", "assets/fixed-storefront/category-visa-hero.webp", 1200, 525, 300 * 1024],
  ["零食饮料分类主图", "assets/fixed-storefront/category-snacks-drinks-hero.webp", 1200, 525, 300 * 1024],
  ["第二家园分类主图", "assets/fixed-storefront/category-second-home-hero.webp", 1200, 525, 300 * 1024],
  ["留学分类主图", "assets/fixed-storefront/category-study-hero.webp", 1200, 525, 300 * 1024],
  ["商业装修分类主图", "assets/fixed-storefront/category-renovation-hero.webp", 1200, 525, 300 * 1024],
  ["酒水分类主图", "assets/fixed-storefront/category-wine-hero.webp", 1200, 525, 300 * 1024],
  ["烟草分类主图", "assets/fixed-storefront/category-tobacco-hero.webp", 1200, 525, 300 * 1024],
  ["全部分类入口", "assets/fixed-storefront/quick-all-categories.webp", 600, 600, 120 * 1024],
  ["烟草入口", "assets/fixed-storefront/quick-tobacco.webp", 600, 600, 120 * 1024],
  ["酒水入口", "assets/fixed-storefront/quick-wine.webp", 600, 600, 120 * 1024],
  ["装修入口", "assets/fixed-storefront/quick-renovation.webp", 600, 600, 120 * 1024],
  ["邀请入口", "assets/fixed-storefront/quick-invite.webp", 600, 600, 120 * 1024],
  ["槟榔入口", "assets/fixed-storefront/quick-betel.webp", 600, 600, 120 * 1024],
];

const results = [];
for (const [label, relativePath, expectedWidth, expectedHeight, maxBytes] of specs) {
  const absolutePath = path.join(publicRoot, relativePath);
  try {
    const [metadata, stat] = await Promise.all([
      sharp(absolutePath).metadata(),
      fs.stat(absolutePath),
    ]);
    const failures = [];
    if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
      failures.push(`expected ${expectedWidth}x${expectedHeight}, got ${metadata.width || 0}x${metadata.height || 0}`);
    }
    if (metadata.format !== "webp") failures.push(`expected webp, got ${metadata.format || "unknown"}`);
    if (stat.size > maxBytes) failures.push(`expected <= ${maxBytes} bytes, got ${stat.size}`);
    results.push({
      label,
      path: relativePath,
      width: metadata.width,
      height: metadata.height,
      bytes: stat.size,
      status: failures.length ? "fail" : "pass",
      failures,
    });
  } catch (error) {
    results.push({
      label,
      path: relativePath,
      status: "fail",
      failures: [error instanceof Error ? error.message : String(error)],
    });
  }
}

const failed = results.filter((result) => result.status === "fail");
console.log(JSON.stringify({
  checked: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
}, null, 2));

if (failed.length > 0) process.exit(1);
