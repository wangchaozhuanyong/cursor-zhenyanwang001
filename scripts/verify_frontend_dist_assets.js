#!/usr/bin/env node

/**
 * Verify a Vite dist directory is internally consistent.
 *
 * It catches the common production failure where index.html or built JS/CSS
 * references a hashed /assets/* file that was deleted during deployment.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(process.argv[2] || 'dist');
const entryName = process.argv[3] || ['index.html', 'admin-index.html']
  .find((name) => fs.existsSync(path.join(distDir, name)));
const indexPath = entryName ? path.join(distDir, entryName) : path.join(distDir, 'index.html');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function fail(message, details = []) {
  console.error(`[frontend-assets] ${message}`);
  for (const d of details.slice(0, 50)) console.error(`  - ${d}`);
  if (details.length > 50) console.error(`  ... and ${details.length - 50} more`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail(`missing index.html: ${indexPath}`);
}

const files = walk(distDir).filter((p) => /\.(html|js|css)$/i.test(p));
const references = new Set();
const assetRefRe = /(?:^|["'(`\s])\/?(assets\/[^"'`\s)]+)/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = assetRefRe.exec(text))) {
    const ref = match[1].replace(/[?#].*$/, '');
    if (ref && !ref.endsWith('/')) references.add(ref);
  }
}

const missing = [];
for (const ref of references) {
  const target = path.join(distDir, ref);
  if (!fs.existsSync(target)) missing.push(ref);
}

if (missing.length) {
  fail(`found ${missing.length} missing asset reference(s) in ${distDir}`, missing);
}

const assetCount = walk(path.join(distDir, 'assets')).length;
if (assetCount === 0) {
  fail(`assets directory is empty: ${path.join(distDir, 'assets')}`);
}

console.log(`[frontend-assets] OK ${distDir} (${references.size} references, ${assetCount} asset files)`);
