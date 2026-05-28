import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node verify-frontend-assets.mjs <buildDir> <entryHtml>");
  process.exit(2);
}

const buildDir = process.argv[2];
const entryHtml = process.argv[3];
if (!buildDir || !entryHtml) usage();

const htmlPath = path.resolve(buildDir, entryHtml);
if (!fs.existsSync(htmlPath)) {
  console.error(`[verify-assets] entry html not found: ${htmlPath}`);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");

// Extract `/assets/...(.js|.css)` from HTML (ignore querystring).
const assetRegex = /\/assets\/[^"'?#]+\.(?:css|js)\b/gi;
const assets = Array.from(new Set(html.match(assetRegex) ?? []));

if (assets.length === 0) {
  console.error(`[verify-assets] no /assets/*.css|js references found in ${htmlPath}`);
  process.exit(1);
}

const missing = [];
for (const urlPath of assets) {
  const rel = urlPath.replace(/^\//, "");
  const filePath = path.resolve(buildDir, rel);
  if (!fs.existsSync(filePath)) missing.push({ urlPath, filePath });
}

if (missing.length) {
  console.error(`[verify-assets] missing ${missing.length} referenced asset(s) from ${htmlPath}:`);
  for (const m of missing) console.error(`- ${m.urlPath}  (expected: ${m.filePath})`);
  process.exit(1);
}

console.log(`[verify-assets] OK: ${assets.length} asset reference(s) exist for ${htmlPath}`);
