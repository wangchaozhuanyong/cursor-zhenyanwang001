#!/usr/bin/env node
/**
 * 中马常用浏览器兼容性静态检查（CI / 本地 npm run check:browser-compat）
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function read(relPath) {
  const abs = path.join(root, relPath);
  if (!existsSync(abs)) {
    errors.push(`缺少文件: ${relPath}`);
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

// 1. 首屏 preboot
assertMatch("public/browser-preboot.js", /showUnsupported/, "应包含浏览器不支持提示");
for (const html of ["index.html", "admin-index.html"]) {
  assertMatch(html, /browser-preboot\.js/, "应引入 browser-preboot.js");
  assertMatch(html, /import\.meta\.resolve/, "应包含 import.meta.resolve 兜底");
}

// 2. 应用内 shim
assertMatch("src/main.tsx", /installBrowserCompatShims/, "main.tsx 应安装 browser shims");
assertMatch("src/admin-main.tsx", /installBrowserCompatShims/, "admin-main.tsx 应安装 browser shims");
assertMatch("src/lib/browserBoot.ts", /polyfillArrayAt/, "browserBoot 应包含 Array.at polyfill");

// 3. 底栏触摸（百度等点击无响应高发）
assertNoMatch(
  "src/components/BottomNav.tsx",
  /pointerType\s*===\s*["']touch["'][\s\S]*preventDefault/,
  "底栏不应拦截 touch 合成的 click",
);
assertNoMatch("src/components/BottomNav.tsx", /touchAction:\s*["']none["']/, "底栏不应使用 touch-action: none");

// 4. Vite legacy 默认开启（面向国产 Chromium 壳、旧 Android WebView、Samsung Internet、iOS Safari）
const viteConfig = read("vite.config.ts");
if (viteConfig) {
  if (/VITE_LEGACY_BUILD\s*!==\s*["']0["']/.test(viteConfig)) {
    // ok: default on
  } else if (/VITE_LEGACY_BUILD\s*===\s*["']1["']/.test(viteConfig)) {
    warnings.push("vite.config.ts: legacy 仍为 opt-in(VITE_LEGACY_BUILD=1)，建议默认开启");
  } else {
    errors.push("vite.config.ts: 未找到国产浏览器 legacy 默认开启逻辑");
  }
  if (/!isAdminBuild\s*&&\s*legacyEnabled|legacyEnabled\s*&&\s*!isAdminBuild/.test(viteConfig)) {
    errors.push("vite.config.ts: legacy 不应仅作用于商城，管理后台也需兼容");
  }
  assertMatch("vite.config.ts", /REGIONAL_BROWSER_TARGETS/, "应使用中马常用浏览器目标集合");
  assertMatch("vite.config.ts", /Samsung\s*>=\s*9/i, "应覆盖 Samsung Internet");
  assertMatch("vite.config.ts", /Edge\s*>=\s*79/i, "应覆盖 Edge Chromium");
  assertMatch("vite.config.ts", /Firefox\s*>=\s*78/i, "应覆盖 Firefox ESR 级别浏览器");
}

// 5. 配置加载超时（避免全屏遮罩挡点击）
assertMatch("src/hooks/useSiteCapabilities.ts", /CAPABILITIES_READY_TIMEOUT_MS/, "站点能力加载应有超时兜底");

// 6. CSS 回退
assertMatch("src/index.css", /@supports not \(height: 100dvh\)/, "应包含 100dvh 回退");

// 7. 国产 UA 识别
assertMatch("src/utils/chinaBrowser.ts", /baidubrowser/i, "应识别百度浏览器 UA");
assertMatch("src/utils/chinaBrowser.ts", /micromessenger/i, "应识别微信内置浏览器 UA");
assertMatch("src/utils/chinaBrowser.ts", /mqqbrowser/i, "应识别 QQ 浏览器 UA");
assertMatch("src/utils/browserEnv.ts", /samsungbrowser/i, "应识别 Samsung Internet UA");
assertMatch("src/utils/browserEnv.ts", /detectBrowserEnvFromUa/, "浏览器环境识别应可单元测试");

if (warnings.length) {
  console.warn("\n⚠️  兼容性警告:\n");
  warnings.forEach((w) => console.warn(`  - ${w}`));
}

if (errors.length) {
  console.error("\n❌ 国产浏览器兼容性检查失败:\n");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`✅ 中马常用浏览器兼容性静态检查通过（${warnings.length} 条警告）`);
