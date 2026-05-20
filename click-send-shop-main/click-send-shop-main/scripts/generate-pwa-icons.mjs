import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const legacyFiles = [
  "manifest.webmanifest",
  "pwa-192x192.png",
  "pwa-512x512.png",
  "pwa-maskable-512x512.png",
  "apple-touch-icon.png",
];

for (const file of legacyFiles) {
  await rm(path.join(publicDir, file), { force: true });
}

console.log("PWA icons are dynamic now. Removed legacy static PWA files from public/.");
console.log("Install icons are served from /api/pwa/* using the admin-configured logo.");
