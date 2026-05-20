import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

const mustExist = [
  "manifest.webmanifest",
  "offline.html",
  "pwa-192x192.png",
  "pwa-512x512.png",
  "pwa-maskable-512x512.png",
  "sw.js",
];

const iconPaths = new Set([
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(file) {
  try {
    await access(path.join(dist, file));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const file of mustExist) {
    assert(await exists(file), `Missing dist/${file}`);
  }

  const manifestRaw = await readFile(path.join(dist, "manifest.webmanifest"), "utf8");
  const manifest = JSON.parse(manifestRaw);
  assert(Array.isArray(manifest.icons), "manifest.icons must be an array");
  manifest.icons.forEach((icon) => {
    assert(typeof icon.src === "string", "manifest icon src must be string");
    assert(iconPaths.has(icon.src), `Unexpected manifest icon path: ${icon.src}`);
  });

  const sw = await readFile(path.join(dist, "sw.js"), "utf8");
  const requiredSnippets = [
    "/offline.html",
    "/api\\/(admin|auth|user|orders|cart|checkout|payment|upload)",
    "startsWith(\"/admin\")",
    "new s.NetworkOnly",
  ];
  requiredSnippets.forEach((snippet) => {
    assert(sw.includes(snippet), `sw.js missing required rule fragment: ${snippet}`);
  });

  console.log("PWA verification passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
