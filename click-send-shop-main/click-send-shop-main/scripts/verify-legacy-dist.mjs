#!/usr/bin/env node
/**
 * Verify that opt-in legacy builds keep real nomodule entrypoints for both SPAs.
 *
 * This catches a dangerous false positive: Vite can finish successfully while a
 * later build step leaves only modern chunks in one dist directory.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apps = [
  {
    name: "storefront",
    dist: "dist",
    html: "index.html",
    entryPrefix: "index-legacy-",
  },
  {
    name: "admin",
    dist: "admin-dist",
    html: "admin-index.html",
    entryPrefix: "admin-index-legacy-",
  },
];

const errors = [];

function fail(message) {
  errors.push(message);
}

function readHtml(app) {
  const htmlPath = path.join(root, app.dist, app.html);
  if (!existsSync(htmlPath)) {
    fail(`${app.name}: missing ${app.dist}/${app.html}`);
    return "";
  }
  return readFileSync(htmlPath, "utf8");
}

function listAssets(app) {
  const assetsDir = path.join(root, app.dist, "assets");
  if (!existsSync(assetsDir)) {
    fail(`${app.name}: missing ${app.dist}/assets`);
    return [];
  }
  return readdirSync(assetsDir);
}

function assertReferencedFileExists(app, html, attrName, id) {
  const re = new RegExp(`<script\\s+[^>]*id=["']${id}["'][^>]*${attrName}=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(re);
  if (!match?.[1]) {
    fail(`${app.name}: missing ${id} ${attrName} reference`);
    return;
  }

  const ref = match[1].replace(/^[./]+/, "").replace(/[?#].*$/, "");
  const target = path.join(root, app.dist, ref);
  if (!existsSync(target)) {
    fail(`${app.name}: ${id} points to missing file: ${ref}`);
  }
}

for (const app of apps) {
  const html = readHtml(app);
  const assets = listAssets(app);
  if (!html || assets.length === 0) continue;

  if (!/<script\s+nomodule\b/i.test(html)) {
    fail(`${app.name}: ${app.html} is missing nomodule scripts`);
  }
  if (!/id=["']vite-legacy-polyfill["']/i.test(html)) {
    fail(`${app.name}: ${app.html} is missing vite-legacy-polyfill`);
  }
  if (!/id=["']vite-legacy-entry["']/i.test(html)) {
    fail(`${app.name}: ${app.html} is missing vite-legacy-entry`);
  }

  const legacyFiles = assets.filter((name) => name.includes("-legacy-") && name.endsWith(".js"));
  const hasPolyfill = legacyFiles.some((name) => /^polyfills-legacy-/.test(name));
  const hasEntry = legacyFiles.some((name) => name.startsWith(app.entryPrefix));
  if (!hasPolyfill) {
    fail(`${app.name}: missing polyfills-legacy chunk in ${app.dist}/assets`);
  }
  if (!hasEntry) {
    fail(`${app.name}: missing ${app.entryPrefix}*.js chunk in ${app.dist}/assets`);
  }

  assertReferencedFileExists(app, html, "src", "vite-legacy-polyfill");
  assertReferencedFileExists(app, html, "data-src", "vite-legacy-entry");
}

if (errors.length) {
  console.error("\nLegacy dist verification failed\n");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("Legacy dist verification passed");
