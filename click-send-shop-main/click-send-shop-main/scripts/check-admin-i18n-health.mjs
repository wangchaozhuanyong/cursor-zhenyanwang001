import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const scanDirs = [
  "src/modules/admin",
  "src/i18n/admin/messages",
  "src/i18n/admin",
];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json"]);

const mojibakePatterns = [
  /�/,
  /(?:Ã|Â|â€|â€™|â€œ|â€|â€“|â€”)/,
  /(?:鍟嗗搧|鍒嗙被|璇勮|璇烽|璇蜂|涓嶅|鏂囦欢|闇€|浼樻儬|鎴愬姛|鏇存柊|瀛楁|銆|锛)/,
];

const visibleEnglishTerms = new Map([
  ["Banner", "轮播图 / 横幅图"],
  ["Footer", "页脚"],
  ["Checkout", "结算页"],
  ["Cookie", "浏览器 Cookie / 同意管理"],
  ["SEO", "搜索引擎优化（SEO）"],
  ["URL", "链接地址（URL）"],
  ["Logo", "站点标志（Logo）"],
  ["Favicon", "浏览器图标（Favicon）"],
  ["Level", "等级"],
  ["manual", "人工退款"],
  ["provider", "渠道原路退款"],
  ["none", "不退款"],
  ["normal", "普通商品"],
  ["age_restricted", "年龄限制商品"],
  ["regulated", "受监管商品"],
]);

const issues = [];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    const ext = entry.name.slice(entry.name.lastIndexOf("."));
    if (extensions.has(ext)) out.push(abs);
  }
  return out;
}

function isIgnoredLine(lines, index) {
  return index > 0 && lines[index - 1].includes("encoding-check: ignore-next-line");
}

function extractStringLiterals(line) {
  return [...line.matchAll(/(["'`])((?:\\.|(?!\1).){2,})\1/g)].map((m) => m[2]);
}

function isProbablyVisibleText(value) {
  if (/[\u4e00-\u9fff]/.test(value)) return false;
  if (/(?:rounded|border|flex|grid|items-|justify-|text-|bg-|w-|h-|px-|py-|gap-|shadow|hover:|focus:|list-none)/.test(value)) return false;
  if (/^[A-Za-z0-9_./:@?&=#${}\[\]-]+$/.test(value)) return false;
  if (value.includes("/") || value.includes("@/")) return false;
  return true;
}

for (const file of scanDirs.flatMap((dir) => walk(resolve(ROOT, dir)))) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const normalizedRel = rel.toLowerCase();
  if (normalizedRel.endsWith("zhtoen.ts") || normalizedRel.endsWith("messages/en.ts")) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isIgnoredLine(lines, index)) return;
    const trimmed = line.trim();
    const isCommentOnly = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("*/");
    if (isCommentOnly) return;
    for (const pattern of mojibakePatterns) {
      if (pattern.test(line)) {
        issues.push(`${rel}:${index + 1} mojibake ${line.trim().slice(0, 140)}`);
      }
    }
    if (line.includes("className=") || line.includes("className:")) return;
    if (line.includes("url(#")) return;
    if (/\blevel\b/.test(line) && !/["'`]Level["'`]/.test(line)) return;
    for (const literal of extractStringLiterals(line)) {
      if (!isProbablyVisibleText(literal)) continue;
      for (const [term, suggestion] of visibleEnglishTerms) {
        if (new RegExp(`\\b${term}\\b`, "i").test(literal)) {
          issues.push(`${rel}:${index + 1} admin English "${term}" should be Chinese-first, e.g. ${suggestion}`);
        }
      }
    }
  });
}

if (issues.length) {
  console.error("[i18n-health] issues found:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("[i18n-health] ok");
