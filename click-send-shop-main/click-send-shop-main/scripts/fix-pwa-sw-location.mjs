import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function readDistArg() {
  const distArg = process.argv.find((arg) => arg.startsWith("--dist="));
  return distArg ? distArg.slice("--dist=".length) : "";
}

const dist = path.resolve(root, readDistArg() || process.env.PWA_DIST_DIR || process.env.VITE_BUILD_OUT_DIR || "dist");

async function moveIfExists(fileName) {
  const from = path.join(root, fileName);
  const to = path.join(dist, fileName);
  try {
    await rename(from, to);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(dist, { recursive: true });
  await moveIfExists("sw.js");

  const files = await readdir(root);
  const workboxFiles = files.filter((name) => /^workbox-[a-z0-9]+\.js$/i.test(name));
  for (const file of workboxFiles) {
    await moveIfExists(file);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
