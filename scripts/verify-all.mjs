#!/usr/bin/env node
/**
 * Run common frontend + backend quality gates from repo root.
 * Usage: node scripts/verify-all.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const frontendDir = path.join(root, "click-send-shop-main", "click-send-shop-main");
const serverDir = path.join(root, "server");

function run(label, cwd, command, args = []) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\n[verify-all] FAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run("Repo secret scan", root, "node", ["scripts/check-secret-leaks.mjs"]);

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
