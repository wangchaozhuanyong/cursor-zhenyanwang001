import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const appPrefix = "click-send-shop-main/click-send-shop-main/";
const appRoot = path.join(repoRoot, appPrefix);

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
}

function normalizePath(repoPath) {
  return repoPath.startsWith(appPrefix) ? repoPath.slice(appPrefix.length) : repoPath;
}

function parsePorcelain() {
  return git(["status", "--porcelain=v1", "-uall"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      let repoPath = line.slice(3);
      if (repoPath.includes(" -> ")) repoPath = repoPath.split(" -> ").pop();
      return {
        status,
        repoPath,
        appPath: normalizePath(repoPath),
      };
    });
}

const entries = parsePorcelain();
const existingEntries = entries.filter((entry) => !entry.status.includes("D"));
const failures = [];
const warnings = [];

function fail(area, message, extra = {}) {
  failures.push({ area, message, ...extra });
}

function warn(area, message, extra = {}) {
  warnings.push({ area, message, ...extra });
}

function isExpectedPath(appPath) {
  return (
    appPath === ".gitignore" ||
    appPath === "package.json" ||
    /^server\/migrations\/167_seed_default_home_nav_items\.(up|down)\.js$/.test(appPath) ||
    appPath.startsWith("src/") ||
    appPath.startsWith("scripts/") ||
    appPath.startsWith("docs/")
  );
}

const disallowedPathPatterns = [
  { name: "environment file", pattern: /(^|\/)\.env(?:\.|$)/ },
  { name: "lockfile", pattern: /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/ },
  { name: "frontend dist", pattern: /(^|\/)(dist|admin-dist)(\/|$)/ },
  { name: "local artifacts", pattern: /(^|\/)artifacts(\/|$)/ },
  { name: "node modules", pattern: /(^|\/)node_modules(\/|$)/ },
];

for (const entry of entries) {
  if (!isExpectedPath(entry.appPath)) {
    fail("path-boundary", "Unexpected changed path outside client redesign release buckets", {
      path: entry.repoPath,
    });
  }
  for (const item of disallowedPathPatterns) {
    if (item.pattern.test(entry.appPath) || item.pattern.test(entry.repoPath)) {
      fail("disallowed-path", `Disallowed ${item.name} in release scope`, { path: entry.repoPath });
    }
  }
}

const secretPatterns = [
  { name: "OpenAI style key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "GitHub token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { name: "GitHub fine grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: "Slack token", pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g },
  { name: "Private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    name: "Long literal assigned to secret-like name",
    pattern:
      /(?:api[_-]?key|secret|private[_-]?key|access[_-]?token|refresh[_-]?token|password)\s*[:=]\s*['"][^'"]{24,}['"]/gi,
  },
];

function readTextFile(absPath) {
  try {
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) return "";
    const buf = fs.readFileSync(absPath);
    if (buf.includes(0)) return "";
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

let scannedFiles = 0;
for (const entry of existingEntries) {
  const absPath = path.join(repoRoot, entry.repoPath);
  const text = readTextFile(absPath);
  if (!text) continue;
  scannedFiles += 1;
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const item of secretPatterns) {
      const pattern = new RegExp(item.pattern.source, item.pattern.flags);
      if (pattern.test(lines[index])) {
        fail("secret-scan", `Potential ${item.name}`, {
          path: entry.repoPath,
          line: index + 1,
        });
      }
    }
  }
}

function walkTextFiles(relPath = "src") {
  const start = path.join(appRoot, relPath);
  const results = [];
  const ignoredDirs = new Set(["node_modules", "dist", "admin-dist", "artifacts", ".git"]);

  function walk(absDir) {
    let children = [];
    try {
      children = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const child of children) {
      if (child.name.startsWith(".") && child.name !== ".well-known") continue;
      if (child.isDirectory()) {
        if (ignoredDirs.has(child.name)) continue;
        walk(path.join(absDir, child.name));
        continue;
      }
      if (!child.isFile()) continue;
      const absFile = path.join(absDir, child.name);
      const text = readTextFile(absFile);
      if (!text) continue;
      results.push({
        absFile,
        relFile: path.relative(appRoot, absFile).split(path.sep).join("/"),
        text,
      });
    }
  }

  walk(start);
  return results;
}

const srcTextFiles = walkTextFiles("src");
const clientDesignGateTextFiles = [
  ...srcTextFiles,
  ...walkTextFiles("scripts").filter((file) => (
    file.relFile !== "scripts/check-client-redesign-release-scope.mjs"
    && !file.relFile.startsWith("scripts/baselines/")
  )),
];

function searchProject(pattern) {
  const regex = new RegExp(pattern);
  const lines = [];
  for (const file of srcTextFiles) {
    file.text.split("\n").forEach((line, index) => {
      if (regex.test(line)) {
        lines.push(`${file.relFile}:${index + 1}:${line}`);
      }
    });
  }
  return lines.join("\n");
}

const memberBenefitsCssRefs = searchProject("MemberBenefits\\.css");
if (memberBenefitsCssRefs.trim()) {
  fail("reference-integrity", "Deleted MemberBenefits.css still has src references", {
    references: memberBenefitsCssRefs.trim().split("\n").slice(0, 8),
  });
}

const requiredReferences = [
  { name: "MemberBenefitsView", pattern: "MemberBenefitsView", min: 2 },
  { name: "member-benefits.next.css", pattern: "member-benefits\\.next", min: 1 },
  { name: "ValueVaultCoupon", pattern: "ValueVaultCoupon", min: 3 },
  { name: "SharePassCard", pattern: "SharePassCard", min: 2 },
  { name: "BalanceFolio", pattern: "BalanceFolio", min: 3 },
  { name: "RouteStatePanel", pattern: "RouteStatePanel", min: 3 },
  { name: "StatusTimeline", pattern: "StatusTimeline", min: 3 },
  { name: "storefrontDesignContract", pattern: "storefrontDesignContract", min: 1 },
  { name: "storefront-foundation.css", pattern: "storefront-foundation\\.css", min: 1 },
  { name: "storefront-next.tokens.css", pattern: "storefront-next\\.tokens\\.css", min: 1 },
  { name: "storefront-next.primitives.css", pattern: "storefront-next\\.primitives\\.css", min: 1 },
  { name: "storefront-next.extended-routes.css", pattern: "storefront-next\\.extended-routes\\.css", min: 1 },
];

for (const item of requiredReferences) {
  const result = searchProject(item.pattern);
  const count = result.trim() ? result.trim().split("\n").length : 0;
  if (count < item.min) {
    fail("reference-integrity", `${item.name} has fewer references than expected`, {
      expectedAtLeast: item.min,
      actual: count,
    });
  }
}

const forbiddenLegacyVisualPatterns = [
  { name: "versioned legacy visual token", pattern: /\bv12\b|v12-|v12_/ },
  { name: "legacy storefront page shell", pattern: /store-v12|store-home-v12|store-account-v12|store-profile-v12/ },
  { name: "legacy order/cart visual shell", pattern: /store-orders-v12|store-order-detail-v12|store-cart-v12/ },
  { name: "legacy product card", pattern: /store-product-card/ },
  { name: "legacy product media", pattern: /store-product-media/ },
  { name: "legacy product media token", pattern: /--store-product-media-bg/ },
  { name: "invalid storefront product media token", pattern: /--sf-next-product-card__media-bg/ },
  { name: "legacy product price selector", pattern: /store-price-card|store-price-currency/ },
  { name: "legacy theme product card class", pattern: /theme-product-card(?!-variant)/ },
  { name: "legacy skin product media selector", pattern: /store-skin-product-card__media/ },
  { name: "legacy home product skin card", pattern: /store-skin-product-card|store-art-product-(?:card|media|info)/ },
  { name: "dead product card action selector", pattern: /sf-next-product-card__action/ },
  { name: "legacy bottom navigation", pattern: /store-bottom-nav/ },
  { name: "legacy bottom action spacing", pattern: /store-bottom-action-space|store-bottom-cart-space/ },
  { name: "legacy client token", pattern: /client-v12/ },
  { name: "retired profile visual selector", pattern: /client-profile/ },
  { name: "retired search visual selector", pattern: /store-client-search/ },
  { name: "retired design system visual selector", pattern: /store-client-design/ },
  { name: "retired empty-state visual selector", pattern: /client-empty-state/ },
  { name: "retired ratio image visual selector", pattern: /client-ratio-image/ },
  { name: "retired page shell visual selector", pattern: /(?:^|[^-])client-page(?:__|--|\b)/ },
  { name: "retired container visual selector", pattern: /(?:^|[^-])client-container(?:__|--|\b)/ },
  { name: "retired button visual selector", pattern: /(?:^|[^-])client-button(?:__|--|\b)/ },
  { name: "retired section header visual selector", pattern: /(?:^|[^-])client-section-header(?:__|--|\b)/ },
  { name: "retired generic client layout selector", pattern: /(?:^|[^-])client-(?:header|icon-button|product|price|hero|quick-nav|bottom-nav|search-bar|nav)(?:__|--|\b)/ },
  { name: "retired profile root selector", pattern: /store-profile-(?:page|stack|card|vip-card|tap)|(?:^|[^-])profile-guest-card|profile-guest-desc|profile-brand-logo-ring/ },
  { name: "retired product detail root selector", pattern: /store-product-detail-page/ },
  { name: "retired product detail selector", pattern: /store-detail-(?:layout|gallery|info-card|purchase-bar|mini-action-icon|add-cart|buy-now)/ },
  { name: "retired product detail price selector", pattern: /store-price-detail/ },
  { name: "retired checkout root selector", pattern: /store-checkout-page/ },
  { name: "retired checkout visual selector", pattern: /store-checkout-(?:card|step|item|item-copy|media)/ },
  { name: "retired cart visual selector", pattern: /store-cart-/ },
  { name: "retired cart checkout summary selector", pattern: /store-checkout-summary/ },
  { name: "retired coupon card visual selector", pattern: /store-coupon-card/ },
  { name: "retired coupon amount selector", pattern: /store-coupon-amount/ },
  { name: "retired generic text selector", pattern: /store-card-title|store-caption|store-micro/ },
  { name: "retired shared mobile submit bar selector", pattern: /store-mobile-submit-bar/ },
  { name: "retired home route component", pattern: /\b(?:GuestHome|MemberHome|HomeOpsBlocks|HomeSkinShowcase|NewArrivalOpsSection|HomeHotSalesSection|HomeGridProductCard|HomeNewArrivalCard)\b/ },
  { name: "retired home visual selector", pattern: /store-home-(?:v4|hero-v4|command|nav-grid|desktop|featured|product-shelf)/ },
  { name: "retired home nav band selector", pattern: /store-nav-band/ },
  { name: "retired home nav action selector", pattern: /store-nav-action|store-icon-tile/ },
  { name: "retired home data version selector", pattern: /data-store-home-version/ },
  { name: "retired skin showcase selector", pattern: /store-skin-(?:showcase|home)/ },
  { name: "retired banner skin selector", pattern: /store-skin-banner|store-skin-banner-frame|store-hero-frame/ },
  { name: "retired banner hero selector", pattern: /(?:^|[^-])store-hero-(?:carousel|slide|image|text|copy|dot|indicator|loading|story)/ },
  { name: "retired trust bar selector", pattern: /(?:^|[^-])store-trust-(?:bar|item|icon|label)/ },
  { name: "retired page shell selector", pattern: /(?:^|[^-])store-(?:page-shell|bottom-safe|mobile-page-header|page-title|glass-surface|tab-route-transition|front-layout|standard-page-shell|fixed-header)(?:__|--|\b)/ },
  { name: "retired storefront shell selector", pattern: /(?:^|[^-])store-shell(?:__|--|\b)/ },
  { name: "retired home dead visual selector", pattern: /store-home-(?:main|main-guest|main-member|hero-v2|hero-stack|hero-pill|advisor|focus|trust-compact)/ },
  {
    name: "retired header/search visual selector",
    pattern:
      /(?:^|[^-])store-(?:desktop-header|tablet-bar|tablet-header|tablet-brand|tablet-nav|tablet-actions|tablet-search-button|header-brand|header-nav-link|header-icon-button|header-account-button|header-login-button|page-header|search-field|search-submit-button|brand-logo|notification-button|notification-badge)(?:__|--|\b)/,
  },
  {
    name: "retired route state/transaction visual selector",
    pattern:
      /(?:^|[^-])store-(?:conversion-page|listing-empty|search-empty|loyalty-route-loading|capability-route-loading|order-header-search-field|checkout-coupon-loading-pill|payment-option|payment-channel)(?:__|--|\b)/,
  },
  {
    name: "retired design reference visual selector",
    pattern:
      /(?:^|[^-])store-(?:design-system|share-detail|design-state)(?:__|--|\b)/,
  },
  {
    name: "retired category visual class selector",
    pattern:
      /(^|[^-])store-category-(?:page|main|rail|rail-scroll|tile|tile-icon|tile-label|tile-skeleton|subtab|subtabs|side|side-panel|side-button|side-subbutton|side-indicator|tool-icon|switcher|showcase|mobile|toolbar|topbar|search|brand|content)/,
  },
];

for (const file of clientDesignGateTextFiles) {
  const lines = file.text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const item of forbiddenLegacyVisualPatterns) {
      if (item.pattern.test(lines[index])) {
        fail("legacy-visual-layer", `Forbidden ${item.name} remains in client redesign scope`, {
          path: file.relFile,
          line: index + 1,
        });
      }
    }
  }
}

const clientRuntimeVisualFiles = srcTextFiles.filter((file) => (
  file.relFile.startsWith("src/modules/public/")
  || file.relFile.startsWith("src/modules/storefront-v2/")
  || file.relFile.startsWith("src/routes/")
  || (file.relFile.startsWith("src/components/") && !file.relFile.startsWith("src/components/admin/"))
));

const forbiddenClientRuntimeVisualPatterns = [
  {
    name: "retired generic surface card runtime class",
    pattern: /(?:className|class=)[^\n]*\bstore-card\b|\.store-card\b/,
  },
  {
    name: "retired generic body text runtime class",
    pattern: /\bstore-body-(?:text|small)\b/,
  },
  {
    name: "retired account product card runtime class",
    pattern: /\bstore-account-product-card\b/,
  },
  {
    name: "retired category listing runtime class",
    pattern: /\b(?:store-listing-page|store-category-page|store-category-main|store-product-grid)\b/,
  },
  {
    name: "retired category filter/sort runtime class",
    pattern: /\bstore-category-(?:filter|sort)-(?:button|input|chip|pill|bar)\b/,
  },
  {
    name: "retired category filter action runtime class",
    pattern: /\bstore-filter-(?:reset|confirm)-button\b/,
  },
  {
    name: "retired client theme radius/shadow utility class",
    pattern: /(^|["'\s])theme-(?:rounded|shadow)(["'\s])/,
  },
];

for (const file of clientRuntimeVisualFiles) {
  const lines = file.text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const item of forbiddenClientRuntimeVisualPatterns) {
      if (item.pattern.test(lines[index])) {
        fail("client-runtime-legacy-visual", `Forbidden ${item.name} remains in storefront runtime`, {
          path: file.relFile,
          line: index + 1,
          text: lines[index].trim().slice(0, 220),
        });
      }
    }
  }
}

if (entries.length === 0) {
  warn("scope", "Working tree is clean; release scope check has no changed files.");
}

const summary = {
  changedEntries: entries.length,
  statusCounts: entries.reduce((acc, entry) => {
    acc[entry.status.trim() || "M"] = (acc[entry.status.trim() || "M"] || 0) + 1;
    return acc;
  }, {}),
  scannedFiles,
  warnings,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
