import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src/components", "src/modules/public", "src/styles", "src/index.css"];
const ignored = [
  "/admin/",
  ".test.",
  ".spec.",
  ".d.ts",
  "node_modules",
  "dist",
  "admin-dist",
];
const patterns = [
  /#[0-9a-fA-F]{3,8}\b/g,
  /\brgba?\(/g,
  /\bbg-(?:white|black)\b/g,
  /\btext-(?:white|black)\b/g,
  /\bborder-(?:white|black)\b/g,
  /\bfrom-\[/g,
  /\bvia-\[/g,
  /\bto-\[/g,
  /\bbg-\[#/g,
  /\btext-\[#/g,
  /\bborder-\[#/g,
];

function walk(entry) {
  const abs = path.join(root, entry);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];
  return fs.readdirSync(abs).flatMap((name) => walk(path.join(entry, name)));
}

function shouldScan(file) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (!/\.(css|tsx?|jsx?)$/.test(rel)) return false;
  return !ignored.some((part) => rel.includes(part));
}

const findings = [];
for (const file of scanRoots.flatMap(walk).filter(shouldScan)) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("theme-hardcode-allowed")) return;
    const matched = patterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(line);
    });
    if (matched) findings.push({ file: rel, line: index + 1, text: line.trim().slice(0, 160) });
  });
}

if (!findings.length) {
  console.log("[theme:check] 未发现前台核心区域硬编码颜色。");
  process.exit(0);
}

const byFile = new Map();
for (const finding of findings) {
  const list = byFile.get(finding.file) ?? [];
  if (list.length < 5) list.push(finding);
  byFile.set(finding.file, list);
}

console.warn(`[theme:check] 发现 ${findings.length} 处疑似前台硬编码颜色。默认仅警告，不阻塞构建。`);
for (const [file, items] of byFile) {
  console.warn(`\n${file}`);
  for (const item of items) console.warn(`  ${item.line}: ${item.text}`);
}

if (process.env.THEME_CHECK_STRICT === "1") {
  process.exit(1);
}
