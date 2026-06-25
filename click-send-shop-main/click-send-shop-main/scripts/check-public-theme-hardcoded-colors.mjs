import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baselinePath = path.join(root, "scripts/baselines/theme-hardcoded-colors.json");
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

function findingKey(finding) {
  return `${finding.file}\u0000${finding.text}`;
}

function buildBaseline(findingsToRecord) {
  const counts = new Map();
  for (const finding of findingsToRecord) {
    const key = findingKey(finding);
    const current = counts.get(key);
    counts.set(key, current ? { ...current, count: current.count + 1 } : {
      file: finding.file,
      text: finding.text,
      count: 1,
    });
  }
  return {
    version: 1,
    description: "Known storefront hardcoded color findings. New entries should be replaced with theme/storefront tokens instead of expanding this baseline.",
    total: findingsToRecord.length,
    entries: [...counts.values()].sort((a, b) => (
      a.file.localeCompare(b.file) || a.text.localeCompare(b.text)
    )),
  };
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) return null;
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function writeBaseline(baseline) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
}

function summarizeFindings(items, limit = 30) {
  const byFile = new Map();
  for (const finding of items) {
    const list = byFile.get(finding.file) ?? [];
    if (list.length < 5) list.push(finding);
    byFile.set(finding.file, list);
  }
  let shown = 0;
  for (const [file, fileItems] of byFile) {
    if (shown >= limit) break;
    console.warn(`\n${file}`);
    for (const item of fileItems) {
      if (shown >= limit) break;
      const countSuffix = item.count && item.count > 1 ? ` ×${item.count}` : "";
      console.warn(`  ${item.line ?? "-"}: ${item.text}${countSuffix}`);
      shown += 1;
    }
  }
}

if (process.env.THEME_CHECK_UPDATE_BASELINE === "1") {
  writeBaseline(buildBaseline(findings));
  console.log(`[theme:check] baseline updated: ${path.relative(root, baselinePath)} (${findings.length} findings)`);
  process.exit(0);
}

if (!findings.length) {
  console.log("[theme:check] 未发现前台核心区域硬编码颜色。");
  process.exit(0);
}

const baseline = readBaseline();
if (baseline?.entries?.length) {
  const allowed = new Map();
  for (const entry of baseline.entries) {
    allowed.set(`${entry.file}\u0000${entry.text}`, Number(entry.count) || 1);
  }

  const current = buildBaseline(findings);
  const newEntries = [];
  for (const entry of current.entries) {
    const key = `${entry.file}\u0000${entry.text}`;
    const allowedCount = allowed.get(key) ?? 0;
    if (entry.count > allowedCount) {
      newEntries.push({
        ...entry,
        count: entry.count - allowedCount,
      });
    }
  }

  const resolvedCount = Math.max(0, Number(baseline.total || 0) - findings.length);
  if (!newEntries.length) {
    console.warn(
      `[theme:check] 发现 ${findings.length} 处疑似前台硬编码颜色，均在基线内。` +
      (resolvedCount > 0 ? ` 已减少 ${resolvedCount} 处。` : ""),
    );
    if (process.env.THEME_CHECK_STRICT === "1") process.exit(1);
    process.exit(0);
  }

  const added = newEntries.reduce((sum, item) => sum + item.count, 0);
  console.error(
    `[theme:check] 新增 ${added} 处前台硬编码颜色，不允许扩大主题债务。` +
    ` 请改用 --theme-* / --sf-* token，或在确认合理后运行 THEME_CHECK_UPDATE_BASELINE=1 npm run theme:check 更新基线。`,
  );
  summarizeFindings(newEntries);
  process.exit(1);
}

console.warn(`[theme:check] 发现 ${findings.length} 处疑似前台硬编码颜色。尚未建立基线，默认仅警告，不阻塞构建。`);
summarizeFindings(findings);

if (process.env.THEME_CHECK_STRICT === "1") {
  process.exit(1);
}
