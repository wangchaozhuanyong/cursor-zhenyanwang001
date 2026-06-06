#!/usr/bin/env node
/**
 * Lightweight static security scan for git-tracked source files.
 *
 * This gate is intentionally high-confidence and low-noise. It catches risky
 * patterns that should almost never appear in this codebase, while leaving
 * deeper DAST/SAST tools for the full security pipeline.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const DEFAULT_ADMIN_PASSWORD = ["Admin", "123456"].join("");
const RAW_HTML_PROP = ["dangerously", "SetInnerHTML"].join("");

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const SKIP_PATHS = [
  /(^|\/)node_modules\//,
  /(^|\/)\.git\//,
  /(^|\/)(dist|admin-dist|build|coverage)\//,
  /(^|\/)package-lock\.json$/,
  /(^|\/)scripts\/check-static-security\.mjs$/,
];

function gitTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "git ls-files failed\n");
    process.exit(result.status || 1);
  }
  return result.stdout.split("\0").filter(Boolean);
}

function normalizePath(file) {
  return file.replace(/\\/g, "/");
}

function extensionOf(file) {
  const slash = Math.max(file.lastIndexOf("/"), file.lastIndexOf("\\"));
  const dot = file.lastIndexOf(".");
  return dot > slash ? file.slice(dot).toLowerCase() : "";
}

function isSkipped(file) {
  const normalized = normalizePath(file);
  return SKIP_PATHS.some((pattern) => pattern.test(normalized));
}

function isSourceFile(file) {
  return SOURCE_EXTENSIONS.has(extensionOf(file)) && !isSkipped(file);
}

function lineAndColumnFromLine(line, index) {
  return { line, column: index + 1 };
}

function precedingChar(text, index) {
  return index > 0 ? text[index - 1] : "";
}

function addFinding(findings, file, line, column, rule, detail) {
  findings.push({ file, line, column, rule, detail });
}

function scanLine(findings, file, lineNumber, line, lines) {
  for (const match of line.matchAll(/\beval\s*\(/g)) {
    const index = match.index || 0;
    if (precedingChar(line, index) === ".") continue;
    const { line: lineNo, column } = lineAndColumnFromLine(lineNumber, index);
    addFinding(findings, file, lineNo, column, "global eval", "Avoid executing dynamic JavaScript.");
  }

  for (const match of line.matchAll(/\bnew\s+Function\s*\(/g)) {
    const { line: lineNo, column } = lineAndColumnFromLine(lineNumber, match.index || 0);
    addFinding(findings, file, lineNo, column, "new Function", "Avoid building executable code from strings.");
  }

  const htmlIndex = line.indexOf(RAW_HTML_PROP);
  if (htmlIndex !== -1) {
    const nearby = lines.slice(Math.max(0, lineNumber - 3), Math.min(lines.length, lineNumber + 2)).join("\n");
    if (!/\b(?:sanitizeCmsHtml|DOMPurify\.sanitize)\s*\(/.test(nearby)) {
      const { line: lineNo, column } = lineAndColumnFromLine(lineNumber, htmlIndex);
      addFinding(
        findings,
        file,
        lineNo,
        column,
        "unsafe HTML injection",
        "Raw HTML injection must use sanitizeCmsHtml or DOMPurify.sanitize nearby.",
      );
    }
  }

  for (const match of line.matchAll(new RegExp(`\\b${DEFAULT_ADMIN_PASSWORD}\\b`, "g"))) {
    const { line: lineNo, column } = lineAndColumnFromLine(lineNumber, match.index || 0);
    addFinding(findings, file, lineNo, column, "default admin password", "Do not commit default admin credentials.");
  }

  for (const match of line.matchAll(/\bchild_process\.exec\s*\(/g)) {
    const { line: lineNo, column } = lineAndColumnFromLine(lineNumber, match.index || 0);
    addFinding(findings, file, lineNo, column, "child_process.exec", "Use spawn/spawnSync with an argument array instead.");
  }
}

function scanWholeFile(findings, file, text) {
  const requireExec = /\b(?:const|let|var)\s*\{\s*[^}]*\bexec\b(?!Sync\b)[^}]*\}\s*=\s*require\(["'](?:node:)?child_process["']\)/g;
  for (const match of text.matchAll(requireExec)) {
    const before = text.slice(0, match.index || 0);
    const line = before.split(/\r?\n/).length;
    const column = before.length - before.lastIndexOf("\n");
    addFinding(findings, file, line, column, "child_process exec import", "Use spawn/spawnSync with an argument array instead.");
  }

  const importExec = /\bimport\s*\{\s*[^}]*\bexec\b(?!Sync\b)[^}]*\}\s*from\s*["'](?:node:)?child_process["']/g;
  for (const match of text.matchAll(importExec)) {
    const before = text.slice(0, match.index || 0);
    const line = before.split(/\r?\n/).length;
    const column = before.length - before.lastIndexOf("\n");
    addFinding(findings, file, line, column, "child_process exec import", "Use spawn/spawnSync with an argument array instead.");
  }
}

function scanFile(file) {
  if (!isSourceFile(file)) return [];
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  if (text.includes("\0")) return [];

  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    scanLine(findings, file, index + 1, line, lines);
  });
  scanWholeFile(findings, file, text);
  return findings;
}

const files = gitTrackedFiles();
const findings = files.flatMap(scanFile);

if (!findings.length) {
  console.log(`[check-static-security] OK (${files.filter(isSourceFile).length} source files scanned)`);
  process.exit(0);
}

console.error("[check-static-security] Risky source patterns found:");
for (const item of findings) {
  console.error(`  - ${item.file}:${item.line}:${item.column} ${item.rule}: ${item.detail}`);
}
console.error("\nFix the risky pattern or add a narrowly-scoped sanitizer/safer API before merging.");
process.exit(1);
