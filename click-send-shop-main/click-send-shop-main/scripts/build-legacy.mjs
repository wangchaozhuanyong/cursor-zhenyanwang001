import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();

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

await runNodeScript([path.join("node_modules", "vite", "bin", "vite.js"), "build"], {
  ...process.env,
  VITE_LEGACY_BUILD: "1",
});
await runNodeScript([path.join("scripts", "fix-pwa-sw-location.mjs")]);
