import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

const mustExist = [
  "offline.html",
  "sw.js",
];

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

  assert(!(await exists("manifest.webmanifest")), "dist/manifest.webmanifest should not exist; PWA manifest is dynamic at /manifest.webmanifest");
  assert(!(await exists("pwa-192x192.png")), "dist/pwa-192x192.png should not exist; icon is dynamic at /pwa-192x192.png");
  assert(!(await exists("pwa-512x512.png")), "dist/pwa-512x512.png should not exist; icon is dynamic at /pwa-512x512.png");
  assert(!(await exists("pwa-maskable-512x512.png")), "dist/pwa-maskable-512x512.png should not exist; icon is dynamic at /pwa-maskable-512x512.png");

  const sw = await readFile(path.join(dist, "sw.js"), "utf8");
  const requiredSnippets = [
    "/offline.html",
    "admin|auth|user|orders|cart|checkout|payment|upload",
    "/api/pwa/",
    "reviews\\/pending|points|rewards|invite",
    "/api/home/bootstrap",
    '"GET"',
    "new s.NetworkOnly",
  ];
  const forbiddenSnippets = [
    "networkOnlyApiPattern",
    "networkOnlyPagePattern",
    "isGetRequest",
  ];
  requiredSnippets.forEach((snippet) => {
    assert(sw.includes(snippet), `sw.js missing required rule fragment: ${snippet}`);
  });
  forbiddenSnippets.forEach((snippet) => {
    assert(!sw.includes(snippet), `sw.js must not reference unresolved symbol: ${snippet}`);
  });

  console.log("PWA verification passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
