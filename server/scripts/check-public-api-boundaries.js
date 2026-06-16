'use strict';

const fs = require('fs');
const path = require('path');

const modulesDir = path.resolve(__dirname, '..', 'src', 'modules');
const forbiddenRouterApiRequireRe = /\brequire\s*\([^)]*\)\s*\)?\s*\.api\b/;
const forbiddenRouterApiVariableRe = /(?:\b[A-Za-z_$][\w$]*|\))\s*\??\s*\.api\b/;
const quotedStringRe = /(['"`])(?:\\.|(?!\1)[\s\S])*\1/g;

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (name.endsWith('.js')) acc.push(full);
  }
}

const files = [];
walk(modulesDir, files);

const violations = [];
for (const file of files) {
  const baseName = path.basename(file);
  if (baseName === 'index.js' || baseName.includes('.api.')) continue;

  const text = fs.readFileSync(file, 'utf8');
  const textWithoutStrings = text.replace(quotedStringRe, '""');
  if (forbiddenRouterApiRequireRe.test(text) || forbiddenRouterApiVariableRe.test(textWithoutStrings)) {
    violations.push(path.relative(path.resolve(__dirname, '..'), file));
  }
}

if (violations.length > 0) {
  console.error('[check:public-api-boundaries] Cross-module consumers must use <module>/publicApi, not router.api:');
  for (const rel of violations) console.error(`- ${rel}`);
  console.error('\nFix: expose needed behavior in server/src/modules/<module>/publicApi.js and import that facade.\n');
  process.exit(1);
}

console.log('[check:public-api-boundaries] OK');
