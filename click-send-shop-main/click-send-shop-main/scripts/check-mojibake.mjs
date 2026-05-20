import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();

const scanDirs = [
  "src",
  "../../server/src",
  "../../server/test",
  "scripts",
];

const extensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".css",
  ".html",
  ".yml",
  ".yaml",
]);

const patterns = [
  { name: "replacement-char", regex: /�/ },
  { name: "html-entity-broken", regex: /â[€œ€™“”–—]/ },
  { name: "latin1-mojibake", regex: /(?:Ã|Â|â€|â€™|â€œ|â€|â€“|â€”)/ },
  {
    name: "chinese-mojibake-common",
    regex: /(?:鍟嗗搧|鍒嗙被|璇勮|璇烽|璇蜂|涓嶅|鏂囦欢|闇€|浼樻儬|鎴愬姛|鏇存柊|瀛楁|銆|锛)/,
  },
];

const adminEnglishTerms = [
  "Banner",
  "Footer",
  "Checkout",
  "Cookie",
  "SEO",
  "URL",
  "Logo",
  "Favicon",
  "Level",
  "manual",
  "provider",
  "none",
  "normal",
  "age_restricted",
  "regulated",
];

const chinesePreferredTerms = new Map([
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

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, files);
      continue;
    }
    const ext = entry.name.slice(entry.name.lastIndexOf("."));
    if (extensions.has(ext)) files.push(abs);
  }
  return files;
}

function isIgnoredLine(lines, index) {
  return index > 0 && lines[index - 1].includes("encoding-check: ignore-next-line");
}

function looksLikeUserFacingString(line) {
  if (line.includes("className=") || line.includes("className:")) return false;
  if (line.includes("url(#")) return false;
  if (/\blevel\b/.test(line) && !/["'`]Level["'`]/.test(line)) return false;
  const matches = line.match(/(["'`])((?:\\.|(?!\1).){2,})\1/g) || [];
  return matches.some((raw) => {
    const content = raw.slice(1, -1);
    if (/[\u4e00-\u9fff]/.test(content)) return false;
    if (/(?:rounded|border|flex|grid|items-|justify-|text-|bg-|w-|h-|px-|py-|gap-|shadow|hover:|focus:|list-none)/.test(content)) return false;
    if (/^[A-Za-z0-9_./:@?&=#${}\[\]-]+$/.test(content)) return false;
    if (/^(className|to|href|src|id|key|name|type|method|path|url|endpoint)\b/.test(line.trim())) return false;
    return adminEnglishTerms.some((term) => new RegExp(`\\b${term}\\b`, "i").test(content));
  });
}

function checkFile(abs) {
  const bytes = readFileSync(abs);
  const rel = relative(ROOT, abs).replaceAll("\\", "/");
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    issues.push({ file: rel, line: 1, name: "bom", detail: "源码文件不能带 UTF-8 BOM" });
  }

  const text = bytes.toString("utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (isIgnoredLine(lines, i)) continue;
    const line = lines[i];
    const trimmed = line.trim();
    const isCommentOnly = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("*/");
    if (isCommentOnly) continue;
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        issues.push({ file: rel, line: i + 1, name: pattern.name, detail: line.trim().slice(0, 160) });
      }
    }

    const normalizedRel = rel.toLowerCase();
    if (
      normalizedRel.startsWith("src/modules/admin/") &&
      !normalizedRel.endsWith("zhtoen.ts") &&
      !normalizedRel.endsWith("messages/en.ts")
    ) {
      if (looksLikeUserFacingString(line)) {
        const term = adminEnglishTerms.find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(line));
        issues.push({
          file: rel,
          line: i + 1,
          name: "admin-english-copy",
          detail: `${line.trim().slice(0, 160)}；建议：${chinesePreferredTerms.get(term) || "中文优先"}`,
        });
      }
    }
  }
}

const files = scanDirs.flatMap((dir) => walk(resolve(ROOT, dir)));
for (const file of files) checkFile(file);

if (issues.length) {
  console.error("[check:mojibake] detected encoding/i18n issues:");
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} [${issue.name}] ${issue.detail}`);
  }
  process.exit(1);
}

console.log(`[check:mojibake] ok (${files.length} files scanned)`);
