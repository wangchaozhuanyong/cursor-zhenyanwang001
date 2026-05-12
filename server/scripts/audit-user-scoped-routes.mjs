/**
 * Static audit: non-admin *.routes.js that import user auth middleware,
 * list each HTTP route and whether the handler passes user identity (req.user.id / req.user?.id).
 *
 * Tier 1: handler block mentions req.user
 * Tier 2: handler block mentions req.user.id or req.user?.id (or allowlisted intentional exceptions)
 *
 * Run: node scripts/audit-user-scoped-routes.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulesRoot = path.join(__dirname, '..', 'src', 'modules');

/** Handlers that are auth-gated but intentionally do not scope DB rows by user in the controller. */
const USER_ID_ALLOWLIST = new Set(['listChannels', 'getClientConfig', 'uploadFile', 'uploadFiles']);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith('.routes.js') && !p.includes(`${path.sep}admin${path.sep}`)) acc.push(p);
  }
  return acc;
}

function stripComments(src) {
  return src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** @returns {{ routes: { method: string, path: string, chain: string[] }[], globalAuth: boolean }} */
function parseRouterUseAuthRoutes(src) {
  const clean = stripComments(src);
  const lines = clean.split(/\r?\n/);
  const routes = [];
  let globalAuth = false;

  const routeRe =
    /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]\s*,([\s\S]*?)\);/g;
  let rm;
  while ((rm = routeRe.exec(clean))) {
    const method = rm[1].toUpperCase();
    const pth = rm[2];
    const chain = rm[3]
      .split(',')
      .map((s) => s.trim().split(/\s/)[0])
      .filter(Boolean);
    routes.push({ method, path: pth, chain });
  }

  if (/router\.use\(\s*auth\s*\)/.test(clean)) globalAuth = true;
  return { routes, globalAuth };
}

function handlerName(chain, globalAuth) {
  const filtered = chain.filter((c) => c !== 'auth' && c !== 'validate' && !c.startsWith('upload') && c !== 'paginationCap' && c !== 'userQueryLimiter');
  const last = filtered[filtered.length - 1];
  if (!last) return null;
  if (last.includes('.')) return last;
  return null;
}

function resolveControllerFile(routeFile, ctrlRef) {
  if (!ctrlRef || !ctrlRef.includes('.')) return null;
  const [alias, fn] = ctrlRef.split('.');
  const dir = path.dirname(routeFile);
  const parsed = walkModulesForRequires(fs.readFileSync(routeFile, 'utf8'), dir);
  const reqPath = parsed[alias];
  if (!reqPath) return null;
  let abs = path.normalize(path.join(dir, reqPath));
  if (!abs.endsWith('.js')) abs += '.js';
  if (!fs.existsSync(abs)) return null;
  return { abs, fn };
}

function walkModulesForRequires(src, baseDir) {
  const out = {};
  const re = /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(src))) {
    const rel = m[2];
    if (rel.startsWith('.')) out[m[1]] = rel;
  }
  return out;
}

function exportBlock(src, exportName) {
  const needle = `exports.${exportName}`;
  const i = src.indexOf(needle);
  if (i < 0) return null;
  const rest = src.slice(i);
  const nextExport = rest.search(/\nexports\./);
  const nextModule = rest.search(/\nmodule\.exports/);
  let end = rest.length;
  for (const p of [nextExport, nextModule]) {
    if (p > 0) end = Math.min(end, p);
  }
  return rest.slice(0, end);
}

function getHandlerBlock(filePath, exportName) {
  if (!filePath || !fs.existsSync(filePath) || !exportName) return null;
  const t = fs.readFileSync(filePath, 'utf8');
  return exportBlock(t, exportName);
}

function handlerUsesReqUser(filePath, exportName) {
  const block = getHandlerBlock(filePath, exportName);
  if (block) return /\breq\.user\b/.test(block);
  const t = fs.readFileSync(filePath, 'utf8');
  return /\breq\.user\b/.test(t);
}

/** True if current user id is referenced (typical for per-user scoping). */
function handlerUsesReqUserId(filePath, exportName) {
  const block = getHandlerBlock(filePath, exportName);
  if (!block) return false;
  return /req\.user(?:\?)?\.id\b/.test(block);
}

/**
 * @returns {'allowlisted'|'ok_user_id'|'no_req_user'|'warn_user_no_id'}
 */
function classifyHandler(exportName, filePath) {
  if (USER_ID_ALLOWLIST.has(exportName)) return 'allowlisted';
  const block = getHandlerBlock(filePath, exportName);
  if (!block) return 'no_req_user';
  const hasUser = /\breq\.user\b/.test(block);
  const hasUserId = /req\.user(?:\?)?\.id\b/.test(block);
  if (!hasUser) return 'no_req_user';
  if (hasUserId) return 'ok_user_id';
  return 'warn_user_no_id';
}

const routeFiles = walk(modulesRoot).sort();
const rows = [];

for (const rf of routeFiles) {
  const src = fs.readFileSync(rf, 'utf8');
  if (!src.includes('middleware/auth') && !src.includes("middleware\\auth")) continue;
  const { routes, globalAuth } = parseRouterUseAuthRoutes(src);
  const rel = path.relative(path.join(__dirname, '..'), rf).replace(/\\/g, '/');

  for (const r of routes) {
    const needsAuth = globalAuth || r.chain.includes('auth');
    if (!needsAuth) continue;
    const h = handlerName(r.chain, globalAuth);
    if (!h) continue;
    const resolved = resolveControllerFile(rf, h);
    const ctrlPath = resolved?.abs;
    const exportName = resolved?.fn;
    const tier1 = ctrlPath && exportName ? handlerUsesReqUser(ctrlPath, exportName) : false;
    const tier2 = ctrlPath && exportName ? classifyHandler(exportName, ctrlPath) : 'no_req_user';
    rows.push({
      file: rel,
      route: `${r.method} ${r.path}`,
      handler: h,
      ctrl: ctrlPath ? path.relative(path.join(__dirname, '..'), ctrlPath).replace(/\\/g, '/') : '?',
      tier1_req_user: tier1 ? 'yes' : 'no',
      tier2_scope: tier2,
    });
  }
}

console.log('Routes behind `auth` (non-admin) — req.user / req.user.id audit\n');
console.table(rows);

const needReview = rows.filter((x) => x.tier2_scope !== 'ok_user_id' && x.tier2_scope !== 'allowlisted');
if (needReview.length) {
  console.log('\nReview (unexpected patterns — verify controller passes identity to services):');
  for (const b of needReview) {
    console.log(`- ${b.file} ${b.route} -> ${b.handler} [${b.tier2_scope}]`);
  }
} else {
  console.log('\nAll non-allowlisted handlers reference req.user.id (or allowlisted exceptions documented).');
}

const warns = rows.filter((x) => x.tier2_scope === 'warn_user_no_id');
if (warns.length) {
  console.log('\nWARN: req.user present but no req.user.id / req.user?.id in handler:');
  for (const w of warns) console.log(`- ${w.file} ${w.route} -> ${w.handler}`);
}
