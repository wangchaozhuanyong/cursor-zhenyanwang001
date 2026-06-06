#!/usr/bin/env node
/**
 * Run common frontend + backend quality gates from repo root.
 * Usage: node scripts/verify-all.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const frontendDir = path.join(root, "click-send-shop-main", "click-send-shop-main");
const serverDir = path.join(root, "server");

function resolveCommand(command, args) {
  if (process.platform !== "win32" || command !== "npm") {
    return { command, args };
  }

  const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (!fs.existsSync(npmCli)) {
    return { command: "cmd.exe", args: ["/d", "/s", "/c", "npm.cmd", ...args] };
  }
  return { command: process.execPath, args: [npmCli, ...args] };
}

function run(label, cwd, command, args = []) {
  console.log(`\n=== ${label} ===`);
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.command, resolved.args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n[verify-all] FAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run("Repo secret scan", root, "node", ["scripts/check-secret-leaks.mjs"]);
run("Repo static security scan", root, "node", ["scripts/check-static-security.mjs"]);
run("Local DAST baseline", root, "node", ["scripts/check-dast-local.mjs"]);
run("External DAST baseline (skips without DAST_BASE_URL)", root, "node", ["scripts/check-dast-baseline.mjs"]);

run("Frontend dependency audit", frontendDir, "npm", ["audit", "--omit=dev"]);
run("Frontend lint", frontendDir, "npm", ["run", "lint"]);
run("Frontend typecheck", frontendDir, "npm", ["run", "typecheck"]);
run("Frontend strict-api typecheck", frontendDir, "npm", ["run", "typecheck:strict-api"]);
run("Frontend strict-admin typecheck", frontendDir, "npm", ["run", "typecheck:strict-admin"]);
run("Frontend unit tests", frontendDir, "npm", ["run", "test"]);

run("Server dependency audit", serverDir, "npm", ["audit", "--omit=dev"]);
run("Server module structure", serverDir, "npm", ["run", "check:module-structure"]);
run("Server service layer", serverDir, "npm", ["run", "check:service-layer"]);
run("Server module boundaries (strict)", serverDir, "npm", ["run", "check:module-boundaries"]);
run("Server typecheck", serverDir, "npm", ["run", "typecheck"]);
run("Server unit tests", serverDir, "npm", ["run", "test:unit"]);

console.log("\n[verify-all] All gates passed.");
