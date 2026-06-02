import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const storefrontDist = path.join(root, "dist");
const adminDist = "admin-dist";

function runNodeScript(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${args.join(" ")} failed with ${signal || `exit code ${code}`}`));
    });
  });
}

async function restoreStorefrontDist(hasProtectedDist, protectedStorefrontDist, backupRoot) {
  if (hasProtectedDist && existsSync(protectedStorefrontDist)) {
    await rm(storefrontDist, { recursive: true, force: true });
    await cp(protectedStorefrontDist, storefrontDist, { recursive: true });
  }
  if (backupRoot) {
    await rm(backupRoot, { recursive: true, force: true });
  }
}

async function main() {
  const hadStorefrontDist = existsSync(storefrontDist);
  const backupRoot = hadStorefrontDist
    ? await mkdtemp(path.join(tmpdir(), "click-send-shop-dist-"))
    : "";
  const protectedStorefrontDist = backupRoot ? path.join(backupRoot, "dist") : "";

  if (hadStorefrontDist) {
    await rm(protectedStorefrontDist, { recursive: true, force: true });
    await cp(storefrontDist, protectedStorefrontDist, { recursive: true });
  }

  try {
    const env = {
      ...process.env,
      VITE_BUILD_OUT_DIR: adminDist,
      PWA_DIST_DIR: adminDist,
    };
    await runNodeScript([path.join("node_modules", "vite", "bin", "vite.js"), "build", "--mode", "admin"], env);
    await runNodeScript([path.join("scripts", "fix-pwa-sw-location.mjs"), `--dist=${adminDist}`], env);
  } finally {
    await restoreStorefrontDist(hadStorefrontDist, protectedStorefrontDist, backupRoot);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
