#!/usr/bin/env node
/**
 * High-confidence secret scan for git-tracked files.
 *
 * This is intentionally conservative: it catches real-looking credentials and
 * private key blocks while avoiding ordinary env variable names in docs.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const DEFAULT_ADMIN_PASSWORD = ["Admin", "123456"].join("");

const SKIP_PATHS = [
  /(^|\/)node_modules\//,
  /(^|\/)\.git\//,
  /(^|\/)(dist|admin-dist|build|coverage)\//,
  /\.(?:png|jpe?g|gif|webp|avif|ico|pdf|zip|gz|tar|mp4|mov|woff2?|ttf|eot)$/i,
];

const SECRET_PATTERNS = [
  {
    name: "private key block",
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |)?PRIVATE KEY-----/g,
  },
  {
    name: "AWS access key id",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    name: "GitHub token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b/g,
  },
  {
    name: "GitHub fine-grained token",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,
  },
  {
    name: "OpenAI API key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g,
  },
  {
    name: "Stripe live secret key",
    pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: "default admin password",
    pattern: new RegExp(`\\b${DEFAULT_ADMIN_PASSWORD}\\b`, "g"),
  },
];

function gitTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "git ls-files failed\n");
    process.exit(result.status || 1);
  }
  return result.stdout.split("\0").filter(Boolean);
}

function isSkipped(file) {
  return SKIP_PATHS.some((pattern) => pattern.test(file.replace(/\\/g, "/")));
}

function lineAndColumn(text, index) {
  const before = text.slice(0, index);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function redact(value) {
  const raw = String(value || "");
  if (raw.length <= 12) return "***";
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
}

function scanFile(file) {
  if (isSkipped(file)) return [];
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  if (text.includes("\0")) return [];

  const findings = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const { line, column } = lineAndColumn(text, match.index || 0);
      findings.push({
        file,
        line,
        column,
        name,
        value: redact(match[0]),
      });
    }
  }
  return findings;
}

const findings = gitTrackedFiles().flatMap(scanFile);

if (!findings.length) {
  console.log(`[check-secret-leaks] OK (${gitTrackedFiles().length} tracked files scanned)`);
  process.exit(0);
}

console.error("[check-secret-leaks] Potential secrets found in tracked files:");
for (const item of findings) {
  console.error(`  - ${item.file}:${item.line}:${item.column} ${item.name} (${item.value})`);
}
console.error("\nRemove real secrets from git history/index before merging.");
process.exit(1);
