#!/usr/bin/env node
/**
 * Static browser-compatibility guard for the China/Malaysia storefront.
 *
 * Default production builds now target modern browsers. Legacy chunks for old
 * Chromium shells, old Android WebView, Samsung Internet 9, and Safari 12 are
 * still available through VITE_LEGACY_BUILD=1.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function read(relPath) {
  const abs = path.join(root, relPath);
  if (!existsSync(abs)) {
    errors.push(`Missing file: ${relPath}`);
    return "";
  }
  return readFileSync(abs, "utf8");
}

function assertNoMatch(relPath, pattern, message) {
  const src = read(relPath);
  if (!src) return;
  if (pattern.test(src)) errors.push(`${relPath}: ${message}`);
}

function assertMatch(relPath, pattern, message) {
  const src = read(relPath);
  if (!src) return;
  if (!pattern.test(src)) errors.push(`${relPath}: ${message}`);
}

// 1. First-screen preboot fallback.
assertMatch("public/browser-preboot.js", /showUnsupported/, "should include unsupported-browser fallback");
for (const html of ["index.html", "admin-index.html"]) {
  assertMatch(html, /browser-preboot\.js/, "should load browser-preboot.js");
  assertMatch(html, /import\.meta\.resolve/, "should keep import.meta.resolve guard");
}

// 2. Runtime browser shims.
assertMatch("src/main.tsx", /installBrowserCompatShims/, "main.tsx should install browser shims");
assertMatch("src/admin-main.tsx", /installBrowserCompatShims/, "admin-main.tsx should install browser shims");
assertMatch("src/lib/browserBoot.ts", /polyfillArrayAt/, "browserBoot should include Array.at polyfill");

// 3. Bottom navigation touch behavior.
assertNoMatch(
  "src/components/BottomNav.tsx",
  /pointerType\s*===\s*["']touch["'][\s\S]*preventDefault/,
  "bottom nav should not block synthetic click after touch",
);
assertNoMatch("src/components/BottomNav.tsx", /touchAction:\s*["']none["']/, "bottom nav should not use touch-action: none");

// 4. Modern default build plus opt-in legacy build.
const viteConfig = read("vite.config.ts");
if (viteConfig) {
  if (/VITE_LEGACY_BUILD\s*!==\s*["']0["']/.test(viteConfig)) {
    errors.push("vite.config.ts: legacy should not be enabled by default; use VITE_LEGACY_BUILD=1 for old-browser builds");
  }
  if (!/legacyEnabled\s*=\s*isEnabledFlag\(env\.VITE_LEGACY_BUILD\)/.test(viteConfig)) {
    errors.push("vite.config.ts: missing opt-in legacy flag logic");
  }
  if (/!isAdminBuild\s*&&\s*legacyEnabled|legacyEnabled\s*&&\s*!isAdminBuild/.test(viteConfig)) {
    errors.push("vite.config.ts: legacy should not be limited to the storefront only");
  }
  assertMatch("vite.config.ts", /MODERN_BUILD_TARGETS/, "should declare modern build targets");
  assertMatch("vite.config.ts", /target:\s*legacyEnabled\s*\?\s*undefined\s*:\s*\[\.\.\.MODERN_BUILD_TARGETS\]/, "legacy builds should let plugin-legacy own the JS target");
  assertNoMatch("vite.config.ts", /modernTargets\s*:/, "legacy plugin should not set modernTargets while rendering legacy chunks");
  assertMatch("vite.config.ts", /REGIONAL_BROWSER_TARGETS/, "should keep old-browser legacy target set");
  assertMatch("vite.config.ts", /Samsung\s*>=\s*9/i, "legacy targets should cover Samsung Internet");
  assertMatch("vite.config.ts", /Edge\s*>=\s*79/i, "legacy targets should cover Edge Chromium");
  assertMatch("vite.config.ts", /Firefox\s*>=\s*78/i, "legacy targets should cover Firefox ESR-level browsers");
}

// 5. Config loading timeout to avoid a full-screen blocker.
assertMatch("src/hooks/useSiteCapabilities.ts", /CAPABILITIES_READY_TIMEOUT_MS/, "site capabilities should have a timeout fallback");

// 6. CSS fallbacks.
assertMatch("src/index.css", /@supports not \(height: 100dvh\)/, "should include 100dvh fallback");

// 7. Regional browser UA detection.
assertMatch("src/utils/chinaBrowser.ts", /baidubrowser/i, "should detect Baidu Browser UA");
assertMatch("src/utils/chinaBrowser.ts", /micromessenger/i, "should detect WeChat embedded browser UA");
assertMatch("src/utils/chinaBrowser.ts", /mqqbrowser/i, "should detect QQ Browser UA");
assertMatch("src/utils/browserEnv.ts", /samsungbrowser/i, "should detect Samsung Internet UA");
assertMatch("src/utils/browserEnv.ts", /detectBrowserEnvFromUa/, "browser environment detection should be unit-testable");

// 8. Legacy production artifact guard.
assertMatch("package.json", /"verify:legacy-dist"\s*:\s*"node scripts\/verify-legacy-dist\.mjs"/, "should expose legacy dist verification script");
assertMatch("package.json", /"test:browser-compat"\s*:\s*"vitest run --pool=threads --maxWorkers=1/, "should expose stable browser compatibility tests");
assertMatch("scripts/build-all.mjs", /verify:legacy-dist/, "legacy build-all should verify legacy dist artifacts");
assertMatch("scripts/verify-legacy-dist.mjs", /vite-legacy-entry/, "legacy verifier should require Vite legacy entry script");

if (warnings.length) {
  console.warn("\nBrowser compatibility warnings\n");
  warnings.forEach((warning) => console.warn(`  - ${warning}`));
}

if (errors.length) {
  console.error("\nBrowser compatibility check failed\n");
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`Browser compatibility check passed (${warnings.length} warning(s))`);
