/**
 * 校验 AdminAppRoutes 中的后台路径均在 adminNavAccess RULES 中有权限映射。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

function extractRoutePaths(source) {
  const paths = new Set();
  for (const m of source.matchAll(/path=["']([^"']+)["']/g)) {
    paths.add(m[1]);
  }
  return paths;
}

function extractRelativeAdminPaths(source) {
  const paths = new Set();
  for (const p of extractRoutePaths(source)) {
    if (p === "*" || p === "/" || p === "/login" || p.startsWith("/")) continue;
    paths.add(p);
  }
  if (source.includes("<Route index element={<Dashboard")) {
    paths.add("__index__");
  }
  return paths;
}

function extractReportRelativePaths() {
  const src = read("src/modules/admin/pages/report/reportRegistry.ts");
  const paths = new Set(["reports", "exports", "reports/profit"]);
  for (const m of src.matchAll(/routePath:\s*["'](\/admin\/[^"']+)["']/g)) {
    paths.add(m[1].replace(/^\/admin\/?/, ""));
  }
  for (const block of src.matchAll(/legacyPaths:\s*\[([\s\S]*?)\]/g)) {
    for (const m of block[1].matchAll(/["'](\/admin\/[^"']+)["']/g)) {
      const rel = m[1].replace(/^\/admin\/?/, "");
      if (rel) paths.add(rel);
    }
  }
  return paths;
}

function buildAccessMatchers(navAccessSource) {
  const matchers = [];
  for (const m of navAccessSource.matchAll(/test:\s*\(p\)\s*=>\s*([^,]+),/g)) {
    const expr = m[1].trim();
    if (expr.includes('startsWith("/admin/')) {
      const prefix = expr.match(/startsWith\("([^"]+)"/)?.[1];
      if (prefix) matchers.push((p) => p.startsWith(prefix));
      continue;
    }
    if (expr.includes('p === "/admin/marketing"')) {
      matchers.push((p) => p === "/admin/marketing" || p.startsWith("/admin/marketing"));
      continue;
    }
    if (expr.includes('p === "/admin"')) {
      matchers.push((p) => p === "/admin" || p === "/admin/");
    }
  }
  return matchers;
}

function hasAccessRule(pathname, matchers) {
  return matchers.some((test) => test(pathname));
}

const adminRoutes = read("src/routes/AdminAppRoutes.tsx");
const routeRegistry = read("src/config/adminRouteRegistry.ts");
const matchers = buildAccessMatchers(routeRegistry);

const relativePaths = new Set([
  ...extractRelativeAdminPaths(adminRoutes),
  ...extractReportRelativePaths(),
]);

const uncovered = [];
for (const rel of relativePaths) {
  const pathname = rel === "__index__" ? "/admin" : `/admin/${rel}`;
  if (!hasAccessRule(pathname, matchers)) {
    uncovered.push(pathname);
  }
}

if (uncovered.length) {
  console.error("[check-admin-route-access] 以下后台路径未在 adminRouteRegistry.ts 登记:\n");
  for (const path of uncovered.sort()) console.error(`  - ${path}`);
  console.error("\n请在 src/config/adminRouteRegistry.ts 的 ADMIN_ROUTE_ACCESS_RULES 中补充对应权限。");
  process.exit(1);
}

console.log(`[check-admin-route-access] OK — ${relativePaths.size} 条后台路由均有权限映射。`);
