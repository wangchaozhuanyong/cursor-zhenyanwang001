/**
 * 检测 migrations 目录中「数字前缀」重复的多套功能迁移。
 * 说明：执行顺序按完整文件名排序；同前缀不同后缀会相邻，但易误导维护者。
 * 已上线环境请勿随意重命名 schema_migrations 中已有记录。
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[check:migrations] migrations 目录不存在，跳过');
    return;
  }
  const files = fs.readdirSync(MIGRATIONS_DIR);
  const bases = new Set();
  for (const f of files) {
    const m = f.match(/^(.+)\.up\.(sql|js)$/);
    if (m) bases.add(m[1]);
  }
  const byPrefix = new Map();
  for (const name of bases) {
    const m = name.match(/^(\d+)_/);
    if (!m) continue;
    const prefix = m[1];
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(name);
  }
  const conflicts = [...byPrefix.entries()].filter(([, names]) => names.length > 1);
  if (!conflicts.length) {
    console.log(`[check:migrations] ok (${bases.size} 个 up 迁移，无前缀冲突)`);
    return;
  }
  console.error('[check:migrations] 发现重复数字前缀（按完整文件名排序执行，请避免新增同前缀迁移）：');
  for (const [prefix, names] of conflicts.sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.error(`  ${prefix}: ${names.sort().join(', ')}`);
  }
  process.exit(1);
}

main();
