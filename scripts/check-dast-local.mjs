#!/usr/bin/env node
/**
 * Start the local Express app and run the non-destructive DAST baseline.
 *
 * This gives CI/local verification a real runtime security probe without
 * needing a staging URL. External/staging targets still use check-dast-baseline.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

process.env.NODE_ENV = "test";
process.env.AUDIT_LOG_DISABLED = process.env.AUDIT_LOG_DISABLED || "1";
process.env.SERVE_SPA = process.env.SERVE_SPA || "0";

const app = require(path.join(root, "server", "src", "app.js"));

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function runBaseline(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", "check-dast-baseline.mjs")], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        DAST_BASE_URL: baseUrl,
        DAST_ALLOWED_HOSTS: "127.0.0.1,localhost",
        DAST_ADMIN_ORIGIN: baseUrl,
        DAST_REQUIRED: "1",
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

const server = app.listen(0, "127.0.0.1");

server.on("error", (error) => {
  console.error(`[check-dast-local] FAILED: ${error?.message || error}`);
  process.exit(1);
});

await new Promise((resolve) => {
  server.on("listening", resolve);
});

const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const baseUrl = `http://127.0.0.1:${port}`;
process.env.ADMIN_ALLOWED_ORIGINS = `${baseUrl},http://localhost:${port}`;
process.env.CORS_ORIGINS = `${baseUrl},http://localhost:${port}`;

console.log(`[check-dast-local] started ${baseUrl}`);
const exitCode = await runBaseline(baseUrl);
await closeServer(server);

if (exitCode !== 0) {
  console.error("[check-dast-local] FAILED");
  process.exit(exitCode);
}

console.log("[check-dast-local] OK");
