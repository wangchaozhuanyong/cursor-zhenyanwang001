import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const appPrefix = "click-send-shop-main/click-send-shop-main/";
const appRoot = path.join(repoRoot, appPrefix);
const scanRoots = ["src/components", "src/modules/public", "src/styles", "src/index.css"];
const ignored = ["/admin/", ".test.", ".spec.", ".d.ts", "node_modules", "dist", "admin-dist"];
const patterns = [
  /#[0-9a-fA-F]{3,8}\b/g,
  /\brgba?\(/g,
  /\bbg-(?:white|black)\b/g,
  /\btext-(?:white|black)\b/g,
  /\bborder-(?:white|black)\b/g,
  /\bfrom-\[/g,
  /\bvia-\[/g,
  /\bto-\[/g,
  /\bbg-\[#/g,
  /\btext-\[#/g,
  /\bborder-\[#/g,
];

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
}

function normalizePath(repoPath) {
  return repoPath.startsWith(appPrefix) ? repoPath.slice(appPrefix.length) : repoPath;
}

function shouldScan(appPath) {
  if (!scanRoots.some((root) => appPath === root || appPath.startsWith(`${root}/`))) return false;
  if (!/\.(css|tsx?|jsx?)$/.test(appPath)) return false;
  return !ignored.some((part) => appPath.includes(part));
}

function parseChangedFiles() {
  return git(["status", "--porcelain=v1", "-uall"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      let repoPath = line.slice(3);
      if (repoPath.includes(" -> ")) repoPath = repoPath.split(" -> ").pop();
      return { status, repoPath, appPath: normalizePath(repoPath) };
    })
    .filter((entry) => entry.repoPath.startsWith(appPrefix) && shouldScan(entry.appPath));
}

function readCurrent(entry) {
  if (entry.status.includes("D")) return "";
  try {
    return fs.readFileSync(path.join(appRoot, entry.appPath), "utf8");
  } catch {
    return "";
  }
}

function readHead(entry) {
  if (entry.status === "??") return "";
  try {
    return git(["show", `HEAD:${entry.repoPath}`]);
  } catch {
    return "";
  }
}

function collectFindings(file, source) {
  const counts = new Map();
  source.split(/\r?\n/).forEach((line, index) => {
    if (line.includes("theme-hardcode-allowed")) return;
    const matched = patterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(line);
    });
    if (!matched) return;
    const text = line.trim().slice(0, 160);
    const current = counts.get(text) || { file, text, count: 0, lines: [] };
    current.count += 1;
    current.lines.push(index + 1);
    counts.set(text, current);
  });
  return counts;
}

const failures = [];
const changedFiles = parseChangedFiles();

for (const entry of changedFiles) {
  const current = collectFindings(entry.appPath, readCurrent(entry));
  const head = collectFindings(entry.appPath, readHead(entry));
  for (const [text, finding] of current) {
    const addedCount = finding.count - (head.get(text)?.count || 0);
    if (addedCount <= 0) continue;
    failures.push({
      file: finding.file,
      line: finding.lines[0],
      text,
      count: addedCount,
    });
  }
}

if (failures.length) {
  console.error(`[theme:check:client-redesign] 本次发布新增 ${failures.reduce((sum, item) => sum + item.count, 0)} 处主题硬编码颜色。`);
  failures.slice(0, 30).forEach((item) => {
    const countSuffix = item.count > 1 ? ` x${item.count}` : "";
    console.error(`  ${item.file}:${item.line}: ${item.text}${countSuffix}`);
  });
  process.exit(1);
}

console.log(`[theme:check:client-redesign] PASS，${changedFiles.length} 个变更前台文件未增加主题硬编码颜色。`);
