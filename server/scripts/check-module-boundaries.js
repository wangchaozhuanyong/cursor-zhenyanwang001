const fs = require('fs');
const path = require('path');

const modulesRoot = path.resolve(__dirname, '..', 'src', 'modules');
const strict = process.env.STRICT_MODULE_BOUNDARIES === '1';
const internalDirs = new Set(['controller', 'repository', 'routes', 'service', 'services']);
const expectedModules = new Set([
  'admin',
  'analytics',
  'auth',
  'cart',
  'dataRetention',
  'health',
  'home',
  'logistics',
  'loyalty',
  'marketing',
  'monitoring',
  'myinvois',
  'notification',
  'order',
  'payment',
  'privacy',
  'product',
  'pwa',
  'search',
  'seo',
  'siteCapabilities',
  'telegram',
  'theme',
  'user',
]);

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.js')) acc.push(full);
  }
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function getModuleName(filePath) {
  const rel = path.relative(modulesRoot, filePath);
  const [moduleName] = rel.split(path.sep);
  return expectedModules.has(moduleName) ? moduleName : null;
}

function getModuleTarget(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  const rel = path.relative(modulesRoot, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;

  const parts = rel.split(path.sep).filter(Boolean);
  const targetModule = parts[0];
  if (!expectedModules.has(targetModule)) return null;
  return {
    moduleName: targetModule,
    parts,
  };
}

function isInternalCrossModuleTarget(target) {
  if (!target || target.parts.length < 2) return false;
  return internalDirs.has(target.parts[1]);
}

function collectRequires(text) {
  const imports = [];
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const importRe = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = requireRe.exec(text))) imports.push(match[1]);
  while ((match = importRe.exec(text))) imports.push(match[1]);
  return imports;
}

function run() {
  const files = [];
  walk(modulesRoot, files);

  const violations = [];
  for (const file of files) {
    const sourceModule = getModuleName(file);
    if (!sourceModule) continue;

    const relFile = toPosix(path.relative(path.resolve(__dirname, '..'), file));
    const text = fs.readFileSync(file, 'utf8');
    for (const specifier of collectRequires(text)) {
      const target = getModuleTarget(file, specifier);
      if (!target || target.moduleName === sourceModule) continue;
      if (!isInternalCrossModuleTarget(target)) continue;

      violations.push({
        file: relFile,
        target: `${target.moduleName}/${target.parts.slice(1).join('/')}`,
        message: `${sourceModule} imports ${target.moduleName} internal ${target.parts[1]} layer`,
      });
    }
  }

  if (violations.length > 0) {
    const label = strict ? 'Forbidden' : 'Legacy';
    console.error(`[check:module-boundaries] ${label} cross-module internal imports detected:`);
    for (const item of violations) {
      console.error(`- ${item.file} -> ${item.target} (${item.message})`);
    }
    console.error('\nFix: expose needed behavior through the target module index.js api, then call that public API from the owning service layer.\n');
    if (strict) process.exit(1);
    console.error('[check:module-boundaries] audit mode: not failing because STRICT_MODULE_BOUNDARIES is not set.');
    return;
  }

  console.log('[check:module-boundaries] OK');
}

run();
