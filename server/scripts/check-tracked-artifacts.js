/**
 * 防止构建产物、上传文件、日志、备份等被 git add 后提交。
 * 用法: node server/scripts/check-tracked-artifacts.js
 */
const { execSync } = require('child_process');

const FORBIDDEN_PATTERNS = [
  /^artifacts\//,
  /^click-send-shop-main\/click-send-shop-main\/artifacts\//,
  /^server\/public\/uploads\/(?!\.gitkeep$).+/,
  /\.log$/,
  /\.bak$/,
  /\/__pycache__\//,
  /\.pyc$/,
  /(^|\/)dist\//,
  /(^|\/)dist-ssr\//,
  /(^|\/)bun\.lockb$/,
];

function listTrackedFiles() {
  const out = execSync('git ls-files', { encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean);
}

function main() {
  const tracked = listTrackedFiles();
  const violations = tracked.filter((file) => FORBIDDEN_PATTERNS.some((re) => re.test(file)));

  if (violations.length === 0) {
    console.log(`[check-tracked-artifacts] OK (${tracked.length} tracked files)`);
    return;
  }

  console.error('[check-tracked-artifacts] Forbidden tracked files detected:');
  for (const file of violations) {
    console.error(`  - ${file}`);
  }
  console.error('\nRemove from index (keeps local files):');
  console.error('  git rm -r --cached artifacts click-send-shop-main/click-send-shop-main/artifacts');
  console.error('  git rm -r --cached server/public/uploads');
  console.error('  git add server/public/uploads/.gitkeep');
  process.exit(1);
}

main();
