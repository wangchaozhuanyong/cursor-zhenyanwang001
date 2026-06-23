import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const appPrefix = "click-send-shop-main/click-send-shop-main/";
const appRoot = path.join(repoRoot, appPrefix);

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
}

function normalizePath(repoPath) {
  return repoPath.startsWith(appPrefix) ? repoPath.slice(appPrefix.length) : repoPath;
}

function parsePorcelain() {
  return git(["status", "--porcelain=v1", "-uall"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      let repoPath = line.slice(3);
      if (repoPath.includes(" -> ")) repoPath = repoPath.split(" -> ").pop();
      return {
        status,
        repoPath,
        appPath: normalizePath(repoPath),
      };
    });
}

const entries = parsePorcelain();
const existingEntries = entries.filter((entry) => !entry.status.includes("D"));
const failures = [];
const warnings = [];

function fail(area, message, extra = {}) {
  failures.push({ area, message, ...extra });
}

function warn(area, message, extra = {}) {
  warnings.push({ area, message, ...extra });
}

function isExpectedPath(appPath) {
  return (
    appPath === ".gitignore" ||
    appPath === "package.json" ||
    appPath.startsWith("src/") ||
    appPath.startsWith("scripts/") ||
    appPath.startsWith("docs/")
  );
}

const disallowedPathPatterns = [
  { name: "environment file", pattern: /(^|\/)\.env(?:\.|$)/ },
  { name: "lockfile", pattern: /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/ },
  { name: "frontend dist", pattern: /(^|\/)(dist|admin-dist)(\/|$)/ },
  { name: "local artifacts", pattern: /(^|\/)artifacts(\/|$)/ },
  { name: "node modules", pattern: /(^|\/)node_modules(\/|$)/ },
];

for (const entry of entries) {
  if (!isExpectedPath(entry.appPath)) {
    fail("path-boundary", "Unexpected changed path outside client redesign release buckets", {
      path: entry.repoPath,
    });
  }
  for (const item of disallowedPathPatterns) {
    if (item.pattern.test(entry.appPath) || item.pattern.test(entry.repoPath)) {
      fail("disallowed-path", `Disallowed ${item.name} in release scope`, { path: entry.repoPath });
    }
  }
}

const secretPatterns = [
  { name: "OpenAI style key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "GitHub token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { name: "GitHub fine grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: "Slack token", pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g },
  { name: "Private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    name: "Long literal assigned to secret-like name",
    pattern:
      /(?:api[_-]?key|secret|private[_-]?key|access[_-]?token|refresh[_-]?token|password)\s*[:=]\s*['"][^'"]{24,}['"]/gi,
  },
];

function readTextFile(absPath) {
  try {
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) return "";
    const buf = fs.readFileSync(absPath);
    if (buf.includes(0)) return "";
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

let scannedFiles = 0;
for (const entry of existingEntries) {
  const absPath = path.join(repoRoot, entry.repoPath);
  const text = readTextFile(absPath);
  if (!text) continue;
  scannedFiles += 1;
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const item of secretPatterns) {
      const pattern = new RegExp(item.pattern.source, item.pattern.flags);
      if (pattern.test(lines[index])) {
        fail("secret-scan", `Potential ${item.name}`, {
          path: entry.repoPath,
          line: index + 1,
        });
      }
    }
  }
}

function walkTextFiles(relPath = "src") {
  const start = path.join(appRoot, relPath);
  const results = [];
  const ignoredDirs = new Set(["node_modules", "dist", "admin-dist", "artifacts", ".git"]);

  function walk(absDir) {
    let children = [];
    try {
      children = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const child of children) {
      if (child.name.startsWith(".") && child.name !== ".well-known") continue;
      if (child.isDirectory()) {
        if (ignoredDirs.has(child.name)) continue;
        walk(path.join(absDir, child.name));
        continue;
      }
      if (!child.isFile()) continue;
      const absFile = path.join(absDir, child.name);
      const text = readTextFile(absFile);
      if (!text) continue;
      results.push({
        absFile,
        relFile: path.relative(appRoot, absFile).split(path.sep).join("/"),
        text,
      });
    }
  }

  walk(start);
  return results;
}

const srcTextFiles = walkTextFiles("src");

function searchProject(pattern) {
  const regex = new RegExp(pattern);
  const lines = [];
  for (const file of srcTextFiles) {
    file.text.split("\n").forEach((line, index) => {
      if (regex.test(line)) {
        lines.push(`${file.relFile}:${index + 1}:${line}`);
      }
    });
  }
  return lines.join("\n");
}

const memberBenefitsCssRefs = searchProject("MemberBenefits\\.css");
if (memberBenefitsCssRefs.trim()) {
  fail("reference-integrity", "Deleted MemberBenefits.css still has src references", {
    references: memberBenefitsCssRefs.trim().split("\n").slice(0, 8),
  });
}

const requiredReferences = [
  { name: "MemberBenefitsView", pattern: "MemberBenefitsView", min: 2 },
  { name: "member-benefits.next.css", pattern: "member-benefits\\.next", min: 1 },
  { name: "ValueVaultCoupon", pattern: "ValueVaultCoupon", min: 3 },
  { name: "SharePassCard", pattern: "SharePassCard", min: 2 },
  { name: "BalanceFolio", pattern: "BalanceFolio", min: 3 },
  { name: "RouteStatePanel", pattern: "RouteStatePanel", min: 3 },
  { name: "StatusTimeline", pattern: "StatusTimeline", min: 3 },
  { name: "storefrontDesignContract", pattern: "storefrontDesignContract", min: 1 },
  { name: "storefront-foundation.css", pattern: "storefront-foundation\\.css", min: 1 },
  { name: "storefront-next.tokens.css", pattern: "storefront-next\\.tokens\\.css", min: 1 },
  { name: "storefront-next.primitives.css", pattern: "storefront-next\\.primitives\\.css", min: 1 },
  { name: "storefront-next.extended-routes.css", pattern: "storefront-next\\.extended-routes\\.css", min: 1 },
];

for (const item of requiredReferences) {
  const result = searchProject(item.pattern);
  const count = result.trim() ? result.trim().split("\n").length : 0;
  if (count < item.min) {
    fail("reference-integrity", `${item.name} has fewer references than expected`, {
      expectedAtLeast: item.min,
      actual: count,
    });
  }
}

if (entries.length === 0) {
  warn("scope", "Working tree is clean; release scope check has no changed files.");
}

const summary = {
  changedEntries: entries.length,
  statusCounts: entries.reduce((acc, entry) => {
    acc[entry.status.trim() || "M"] = (acc[entry.status.trim() || "M"] || 0) + 1;
    return acc;
  }, {}),
  scannedFiles,
  warnings,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
