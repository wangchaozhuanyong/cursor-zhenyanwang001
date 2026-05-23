#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const serverRoot = path.join(__dirname, '..');
const repoRoot = path.join(serverRoot, '..');
const frontendRegistryPath = path.join(repoRoot, 'click-send-shop-main', 'click-send-shop-main', 'src', 'modules', 'admin', 'pages', 'report', 'reportRegistry.ts');
const backendRegistryPath = path.join(serverRoot, 'src', 'modules', 'admin', 'report', 'adminReportRegistry.js');

function fail(message) {
  failures.push(message);
}

function propName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function arrayLiteralToStrings(node, arraysByName) {
  if (!node) return [];
  if (ts.isArrayLiteralExpression(node)) {
    const values = [];
    for (const element of node.elements) {
      if (ts.isStringLiteral(element)) values.push(element.text);
      if (ts.isSpreadElement(element) && ts.isIdentifier(element.expression)) {
        values.push(...(arraysByName.get(element.expression.text) || []));
      }
    }
    return values;
  }
  if (
    ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.name.text === 'filter'
    && ts.isIdentifier(node.expression.expression)
  ) {
    const source = arraysByName.get(node.expression.expression.text) || [];
    const callback = node.arguments[0];
    if (
      callback
      && ts.isArrowFunction(callback)
      && ts.isBinaryExpression(callback.body)
      && callback.body.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
      && ts.isIdentifier(callback.body.left)
      && ts.isStringLiteral(callback.body.right)
    ) {
      return source.filter((value) => value !== callback.body.right.text);
    }
    return source;
  }
  if (ts.isIdentifier(node)) return arraysByName.get(node.text) || [];
  return [];
}

function literalValue(node, arraysByName) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node) || ts.isCallExpression(node) || ts.isIdentifier(node)) {
    return arrayLiteralToStrings(node, arraysByName);
  }
  return undefined;
}

function objectToReport(node, arraysByName) {
  const report = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = propName(property.name);
    if (!key) continue;
    report[key] = literalValue(property.initializer, arraysByName);
  }
  return report;
}

function parseFrontendRegistry() {
  const sourceText = fs.readFileSync(frontendRegistryPath, 'utf8');
  const sourceFile = ts.createSourceFile(frontendRegistryPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const arraysByName = new Map();
  let registryNode = null;

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      if (ts.isArrayLiteralExpression(node.initializer)) {
        arraysByName.set(name, arrayLiteralToStrings(node.initializer, arraysByName));
      }
      if (name === 'REPORT_REGISTRY' && ts.isArrayLiteralExpression(node.initializer)) {
        registryNode = node.initializer;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (!registryNode) {
    throw new Error(`未找到前端 REPORT_REGISTRY: ${frontendRegistryPath}`);
  }
  return registryNode.elements
    .filter(ts.isObjectLiteralExpression)
    .map((node) => objectToReport(node, arraysByName));
}

function normalizeColumns(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function diff(a, b) {
  const bSet = new Set(b);
  return a.filter((value) => !bSet.has(value));
}

const failures = [];
const frontendReports = parseFrontendRegistry();
const backendReports = require(backendRegistryPath).REPORT_REGISTRY;

const frontendExportable = frontendReports.filter((report) => report.exportable === true && report.exportType);
const frontendByExportType = new Map(frontendExportable.map((report) => [report.exportType, report]));
const backendExportable = backendReports.filter((report) => report.exportPermission || report.exportable);
const backendByType = new Map(backendExportable.map((report) => [report.type, report]));

for (const report of frontendExportable) {
  const backend = backendByType.get(report.exportType);
  if (!backend) {
    fail(`前端报表 ${report.key} exportType=${report.exportType} 在后端 adminReportRegistry 中不存在`);
    continue;
  }
  if ((report.capability || '') !== (backend.capability || '')) {
    fail(`报表 ${report.exportType} capability 不一致: frontend=${report.capability || '(none)'} backend=${backend.capability || '(none)'}`);
  }
  if (report.endpoint !== backend.endpoint) {
    fail(`报表 ${report.exportType} endpoint 不一致: frontend=${report.endpoint} backend=${backend.endpoint}`);
  }

  const frontendColumns = sortedUnique(normalizeColumns(report.columns));
  const backendColumns = sortedUnique(normalizeColumns(backend.csvColumns));
  if (frontendColumns.length > 0) {
    const missingBackend = diff(frontendColumns, backendColumns);
    if (missingBackend.length > 0) {
      fail(`报表 ${report.exportType} columns/csvColumns 不一致: backend 缺少前端核心列 [${missingBackend.join(', ')}]`);
    }
  }
}

for (const backend of backendExportable) {
  if (backend.backendOnly === true) continue;
  if (!frontendByExportType.has(backend.type)) {
    fail(`后端导出类型 ${backend.type} 没有对应前端页面 exportType，也未标记 backendOnly`);
  }
}

if (failures.length > 0) {
  console.error('[check-report-registry] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[check-report-registry] ok: ${frontendExportable.length} exportable reports checked`);
