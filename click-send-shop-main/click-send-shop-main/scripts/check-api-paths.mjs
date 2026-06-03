import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

const scanRoots = [
  path.join(srcRoot, "api"),
  path.join(srcRoot, "services"),
];

const requestHelpers = new Set(["get", "post", "put", "patch", "del"]);
const violations = [];
const adminApiPublicEndpointAllowlist = new Map([
  ["src/api/admin/theme.ts", ["/theme/"]],
]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function rel(filePath) {
  return toPosix(path.relative(projectRoot, filePath));
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function addViolation(file, index, message) {
  violations.push(`${rel(file)}:${lineNumber(fs.readFileSync(file, "utf8"), index)} ${message}`);
}

function checkEndpoint(file, text, index, helperName, endpoint) {
  const relative = rel(file);
  const isAdminApiFile = relative.startsWith("src/api/admin/");
  const isPublicApiFile = relative.startsWith("src/api/modules/");
  const allowedPublicPrefixes = adminApiPublicEndpointAllowlist.get(relative) || [];

  if (!endpoint.startsWith("/")) {
    addViolation(file, index, `${helperName} endpoint must start with "/": ${endpoint}`);
    return;
  }

  if (endpoint.startsWith("/api/")) {
    addViolation(file, index, `${helperName} endpoint must not include /api; request.ts adds VITE_API_BASE_URL: ${endpoint}`);
  }

  if (
    isAdminApiFile
    && !endpoint.startsWith("/admin/")
    && !allowedPublicPrefixes.some((prefix) => endpoint.startsWith(prefix))
  ) {
    addViolation(file, index, `admin API module endpoint must start with /admin/: ${endpoint}`);
  }

  if (isPublicApiFile && endpoint.startsWith("/admin/")) {
    addViolation(file, index, `public API module must not call admin endpoint: ${endpoint}`);
  }
}

function checkRequestHelperCalls(file, text) {
  const importedHelpers = getImportedRequestHelpers(text);
  if (importedHelpers.length === 0) return;

  const helperNames = importedHelpers.join("|");
  const re = new RegExp(`\\b(${helperNames})\\s*(?:<[^;{}()]*>)?\\s*\\(\\s*([\\\`"'])([^\\\`"']*)\\2`, "g");
  let match;
  while ((match = re.exec(text))) {
    const [, helperName, , endpoint] = match;
    checkEndpoint(file, text, match.index, helperName, endpoint);
  }
}

function getImportedRequestHelpers(text) {
  const helpers = new Set();
  const importRe = /import\s*\{([^}]+)\}\s*from\s*["']@\/api\/request["']/g;
  let match;
  while ((match = importRe.exec(text))) {
    for (const raw of match[1].split(",")) {
      const imported = raw.trim().split(/\s+as\s+/)[0]?.trim();
      if (requestHelpers.has(imported)) helpers.add(imported);
    }
  }
  return Array.from(helpers);
}

function checkDirectFetch(file, text) {
  if (rel(file) === "src/api/request.ts") return;

  const fetchRe = /\bfetch\s*\(\s*([`"'])([^`"']*)\1/g;
  let match;
  while ((match = fetchRe.exec(text))) {
    const raw = match[2];
    if (/^https?:\/\//.test(raw)) {
      addViolation(file, match.index, `direct fetch must not hard-code absolute API URL: ${raw}`);
    }
    if (raw.startsWith("/admin/") || raw.startsWith("/auth/") || raw.startsWith("/products/") || raw.startsWith("/orders/")) {
      addViolation(file, match.index, `direct fetch must use /api base path or request helpers: ${raw}`);
    }
    if (raw.includes("/api/admin/")) {
      addViolation(file, match.index, `frontend code should use /admin/... endpoint plus /api base, not hard-code /api/admin: ${raw}`);
    }
  }
}

for (const file of scanRoots.flatMap((root) => walk(root))) {
  const text = fs.readFileSync(file, "utf8");
  checkRequestHelperCalls(file, text);
  checkDirectFetch(file, text);
}

if (violations.length > 0) {
  console.error("[check:api-paths] Frontend API path violations detected:");
  for (const item of violations) console.error(`- ${item}`);
  console.error("\nRule: request helpers receive /admin/... for admin APIs and public endpoints like /products; request.ts adds /api.");
  process.exit(1);
}

console.log("[check:api-paths] OK");
