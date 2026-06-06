import { spawn } from "node:child_process";

const root = process.cwd();
const legacy = process.argv.includes("--legacy");
const buildEnv = {
  ...process.env,
  VITE_LEGACY_BUILD: legacy ? "1" : "0",
};

function npmCommand(args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd", ...args],
    };
  }
  return {
    command: "npm",
    args,
  };
}

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with ${signal || `exit code ${code}`}`));
    });
  });
}

async function main() {
  let npm = npmCommand(["run", "build:admin"]);
  await run(npm.command, npm.args, buildEnv);
  npm = npmCommand(["run", legacy ? "build:legacy" : "build"]);
  await run(npm.command, npm.args, buildEnv);
  npm = npmCommand(["run", "verify:dist"]);
  await run(npm.command, npm.args, buildEnv);
  if (legacy) {
    npm = npmCommand(["run", "verify:legacy-dist"]);
    await run(npm.command, npm.args, buildEnv);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
