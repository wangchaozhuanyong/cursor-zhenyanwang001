#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const ignoredDirs = new Set([
  '.git',
  '.codex-backups',
  '.deploy-state',
  '.tools',
  'admin-dist',
  'backups',
  'dist',
  'logs',
  'node_modules',
]);

const allowed = new Set();

const scanRoots = [
  path.join(repoRoot, 'server', 'src'),
  path.join(repoRoot, 'click-send-shop-main', 'click-send-shop-main', 'src'),
  path.join(repoRoot, 'click-send-shop-main', 'click-send-shop-main', 'scripts'),
];

function shouldScan(filePath) {
  return /\.(cjs|js|jsx|mjs|ts|tsx)$/.test(filePath);
}

function walk(dir, output) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
    } else if (entry.isFile() && shouldScan(fullPath)) {
      output.push(fullPath);
    }
  }
}

const files = [];
for (const root of scanRoots) walk(root, files);

const violations = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('@ts-nocheck')) continue;
  const relative = path.relative(repoRoot, file).split(path.sep).join('/');
  if (!allowed.has(relative)) violations.push(relative);
}

if (violations.length > 0) {
  console.error('[check:no-new-ts-nocheck] 新增 @ts-nocheck 被禁止：');
  for (const file of violations) console.error(`  - ${file}`);
  console.error('请修复类型问题，或在代码评审中明确说明后再加入白名单。');
  process.exit(1);
}

console.log(`[check:no-new-ts-nocheck] ok (${files.length} files scanned, ${allowed.size} legacy allowlisted)`);
