/**
 * 校验后台文案注册表完整性（导航 i18n + 报表列名），避免界面出现 nav.xxx / 字段: xxx。
 * 与站点设置（site_settings）无关：后台 UI 文案走静态注册表，不走运营后台配置。
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const REPO_ROOT = resolve(ROOT, "../..");

function read(relFromShop) {
  const p = resolve(ROOT, relFromShop);
  if (!existsSync(p)) throw new Error(`missing file: ${p}`);
  return readFileSync(p, "utf8");
}

function readRepo(rel) {
  const p = resolve(REPO_ROOT, rel);
  if (!existsSync(p)) throw new Error(`missing file: ${p}`);
  return readFileSync(p, "utf8");
}

/** 从 messages/zh.ts 等提取 nav / routeTitles 的 key 列表 */
function extractMessageSectionKeys(source, section) {
  const re = new RegExp(`${section}:\\s*\\{([^}]+)\\}`, "s");
  const block = source.match(re)?.[1] ?? "";
  return [...block.matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((m) => m[1]);
}

function getByPath(obj, path) {
  let cur = obj;
  for (const p of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function buildMessages(zhSource, enSource) {
  const sections = ["nav", "routeTitles"];
  const zh = {};
  const en = {};
  for (const s of sections) {
    zh[s] = Object.fromEntries(extractMessageSectionKeys(zhSource, s).map((k) => [k, k]));
    en[s] = Object.fromEntries(extractMessageSectionKeys(enSource, s).map((k) => [k, k]));
  }
  return { zh, en };
}

function collectI18nKeysFromSource(source) {
  const keys = new Set();
  for (const m of source.matchAll(/labelKey:\s*"([^"]+)"/g)) keys.add(m[1]);
  for (const m of source.matchAll(/titleKey:\s*"([^"]+)"/g)) keys.add(m[1]);
  for (const m of source.matchAll(/\bt\(\s*"([^"]+)"\s*\)/g)) keys.add(m[1]);
  for (const m of source.matchAll(/seg\(\s*"([^"]+)"/g)) keys.add(m[1]);
  return keys;
}

function extractReportColumnLabelKeys(displayLabelsSource) {
  const block = displayLabelsSource.match(
    /export const REPORT_COLUMN_LABELS[^=]*=\s*\{([\s\S]*?)\n\};/,
  )?.[1];
  if (!block) return new Set();
  return new Set([...block.matchAll(/^\s*([a-z][a-z0-9_]*):/gm)].map((m) => m[1]));
}

const SQL_TYPE_ALIASES = new Set([
  "char", "varchar", "int", "bigint", "decimal", "signed", "unsigned", "null", "datetime",
]);

const RESPONSE_META_KEYS = new Set([
  "last_updated_at", "date_from", "date_to", "list", "summary",
]);

/** 仅扫描走 AdminReportGenericPage 的 selectSimple* 查询，避免流量等大报表误报 */
function extractSelectSimpleSqlBlocks(sqlSource) {
  const blocks = [];
  const re = /async function selectSimple\w+[^{]*\{([\s\S]*?)^\}/gm;
  for (const m of sqlSource.matchAll(re)) blocks.push(m[1]);
  return blocks.join("\n");
}

function extractSqlColumnAliases(sqlChunk) {
  const aliases = new Set();
  for (const m of sqlChunk.matchAll(/\bAS\s+([a-z][a-z0-9_]*)\b/gi)) {
    const name = m[1].toLowerCase();
    if (SQL_TYPE_ALIASES.has(name)) continue;
    if (RESPONSE_META_KEYS.has(name)) continue;
    aliases.add(name);
  }
  return aliases;
}

const REPORT_TOKEN_LABELS = {
  units: 1, per: 1, order: 1, rate: 1, sales: 1, stock: 1, status: 1, type: 1, activity: 1,
  coupon: 1, product: 1, category: 1, user: 1, payment: 1, refund: 1, amount: 1, count: 1,
  avg: 1, daily: 1, monthly: 1, mom: 1, growth: 1, claim: 1, claimed: 1, use: 1, used: 1,
  issued: 1, expired: 1, paid: 1, gross: 1, net: 1, items: 1, sold: 1, warning: 1, current: 1,
  available: 1, days: 1, view: 1, cart: 1, favorite: 1, profit: 1, margin: 1, conversion: 1,
};

function wouldShowRawFieldKey(key, labelKeys) {
  if (labelKeys.has(key)) return false;
  if (key.endsWith("_id")) {
    const base = key.slice(0, -3);
    if (labelKeys.has(base)) return false;
  }
  const parts = key.split("_").filter(Boolean);
  if (parts.every((p) => REPORT_TOKEN_LABELS[p])) return false;
  if (parts.some((p) => /^[a-z]+$/i.test(p))) return true;
  return false;
}

const issues = [];

const zhSource = read("src/i18n/admin/messages/zh.ts");
const enSource = read("src/i18n/admin/messages/en.ts");
const zhNav = new Set(extractMessageSectionKeys(zhSource, "nav"));
const enNav = new Set(extractMessageSectionKeys(enSource, "nav"));
const zhRoutes = new Set(extractMessageSectionKeys(zhSource, "routeTitles"));
const enRoutes = new Set(extractMessageSectionKeys(enSource, "routeTitles"));

const layoutSrc = read("src/layouts/AdminLayout.tsx");
const navTitleSrc = read("src/config/adminNavTitle.ts");
const routesSrc = read("src/routes/AdminAppRoutes.tsx");

const i18nKeys = [
  ...collectI18nKeysFromSource(layoutSrc),
  ...collectI18nKeysFromSource(navTitleSrc),
  ...collectI18nKeysFromSource(routesSrc),
].filter((k) => k.startsWith("nav.") || k.startsWith("routeTitles."));

for (const fullKey of new Set(i18nKeys)) {
  const [section, ...rest] = fullKey.split(".");
  const leaf = rest.join(".");
  if (!leaf) continue;
  const zhSet = section === "nav" ? zhNav : zhRoutes;
  const enSet = section === "nav" ? enNav : enRoutes;
  if (!zhSet.has(leaf)) {
    issues.push(`missing zh.ts ${section}.${leaf} (referenced as ${fullKey})`);
  }
  if (!enSet.has(leaf)) {
    issues.push(`missing en.ts ${section}.${leaf} (referenced as ${fullKey})`);
  }
}

const displaySrc = read("src/utils/adminDisplayLabels.ts");
const labelKeys = extractReportColumnLabelKeys(displaySrc);

let reportSql = "";
try {
  reportSql = readRepo("server/src/modules/admin/repository/adminReport.repository.js");
} catch {
  issues.push("cannot read server adminReport.repository.js for column alias scan");
}

if (reportSql) {
  const serviceSrc = readRepo("server/src/modules/admin/service/adminReport.service.js");
  const simpleSql = extractSelectSimpleSqlBlocks(reportSql);
  const aliases = new Set([
    ...extractSqlColumnAliases(simpleSql),
    ...extractSqlColumnAliases(serviceSrc),
  ]);
  for (const key of ["claim_rate", "use_rate", "roi"]) aliases.add(key);
  for (const alias of aliases) {
    if (!wouldShowRawFieldKey(alias, labelKeys)) continue;
    issues.push(
      `missing REPORT_COLUMN_LABELS["${alias}"] — generic report table may show 字段: ${alias}`,
    );
  }
}

if (issues.length) {
  console.error("[admin-label-registry] incomplete registry:");
  for (const issue of issues) console.error(`- ${issue}`);
  console.error("");
  console.error("Fix: add keys to src/i18n/admin/messages/{zh,en}.ts (nav/routeTitles)");
  console.error("  or src/utils/adminDisplayLabels.ts (REPORT_COLUMN_LABELS).");
  console.error("Admin UI copy is NOT loaded from site settings.");
  process.exit(1);
}

console.log("[admin-label-registry] ok");
