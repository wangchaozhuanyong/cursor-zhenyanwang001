/**
 * 分层门禁：禁止在非 repository 代码中直接访问连接池执行 SQL。
 * 扫描 src/modules、src/utils、src/middleware、src/routes；
 * 排除 *.repository.js、*controller*、*.routes.js、*mapper*、schemas。
 */
const fs = require('fs');
const path = require('path');

const scanRoots = [
  path.join(__dirname, '../src/modules'),
  path.join(__dirname, '../src/utils'),
  path.join(__dirname, '../src/middleware'),
  path.join(__dirname, '../src/routes'),
];

function shouldSkipFile(relPath, baseName) {
  if (baseName.endsWith('.repository.js')) return true;
  if (baseName.endsWith('.routes.js')) return true;
  if (baseName.includes('controller')) return true;
  if (baseName.includes('mapper')) return true;
  if (relPath.includes(`${path.sep}schemas${path.sep}`)) return true;
  return false;
}

/** @param {string} dir @param {string[]} acc */
function walk(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.js')) acc.push(full);
  }
}

const files = [];
for (const root of scanRoots) {
  walk(root, files);
}

const dbQueryRe = /\bdb\.query\s*\(/;
const poolQueryRe = /\bpool\.query\s*\(/;
const requireDbRe = /require\s*\(\s*['"][^'"]*config\/db['"]\s*\)/;

let failed = false;
for (const f of files) {
  const rel = path.relative(path.join(__dirname, '..'), f);
  const base = path.basename(f);
  if (shouldSkipFile(rel, base)) continue;

  const text = fs.readFileSync(f, 'utf8');
  if (dbQueryRe.test(text)) {
    console.error(`[check-service-layer] Forbidden db.query in non-repository file: ${rel}`);
    failed = true;
  }
  if (poolQueryRe.test(text)) {
    console.error(`[check-service-layer] Forbidden pool.query in non-repository file: ${rel}`);
    failed = true;
  }
  if (requireDbRe.test(text)) {
    console.error(`[check-service-layer] Forbidden require(config/db) in non-repository file: ${rel}`);
    failed = true;
  }
}

/** *service*.js 中禁止在 pool/conn 上直接 .query */
const serviceFiles = files.filter((p) => path.basename(p).includes('service') && p.endsWith('.js'));
const anyConnQueryRe = /\b(?:pool|conn|connection|db)\s*\.\s*query\s*\(/;
for (const f of serviceFiles) {
  const rel = path.relative(path.join(__dirname, '..'), f);
  const text = fs.readFileSync(f, 'utf8');
  if (anyConnQueryRe.test(text)) {
    console.error(`[check-service-layer] Forbidden .query() on pool/conn in service file: ${rel}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nFix: SQL stays in *repository*.js; service uses repository methods only.\n');
  process.exit(1);
}
