import { access, copyFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function readDistArg() {
  const distArg = process.argv.find((arg) => arg.startsWith("--dist="));
  return distArg ? distArg.slice("--dist=".length) : "";
}

const dist = path.resolve(root, readDistArg() || process.env.PWA_DIST_DIR || process.env.VITE_BUILD_OUT_DIR || "dist");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveIfExists(fileName) {
  const from = path.join(root, fileName);
  const to = path.join(dist, fileName);
  try {
    await rename(from, to);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    try {
      await copyFile(from, to);
      await rm(from, { force: true });
      return true;
    } catch (copyError) {
      if (copyError?.code === "ENOENT") return false;
      throw copyError;
    }
  }
}

async function listRootPwaFiles() {
  const files = await readdir(root);
  return files.filter((name) => name === "sw.js" || /^workbox-[a-z0-9]+\.js$/i.test(name));
}

async function moveGeneratedPwaFiles() {
  const files = await listRootPwaFiles();
  let moved = 0;
  for (const file of files) {
    if (await moveIfExists(file)) moved += 1;
  }
  return moved;
}

async function main() {
  await mkdir(dist, { recursive: true });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await moveGeneratedPwaFiles();
    const rootPwaFiles = await listRootPwaFiles();
    const distHasSw = await exists(path.join(dist, "sw.js"));
    if (distHasSw && rootPwaFiles.length === 0) return;
    if (attempt < 5) await sleep(250);
  }

  const rootPwaFiles = await listRootPwaFiles();
  if (rootPwaFiles.length > 0) {
    throw new Error(`PWA files still outside ${path.relative(root, dist) || "."}: ${rootPwaFiles.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
