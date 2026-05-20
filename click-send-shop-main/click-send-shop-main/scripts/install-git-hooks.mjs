import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

function findGitRoot(startDir) {
  let dir = resolve(startDir);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    dir = dirname(dir);
  }
  return null;
}

const projectDir = process.cwd();
const gitRoot = findGitRoot(projectDir);

if (!gitRoot) {
  console.log("[git-hooks] .git not found, skip pre-commit install");
  process.exit(0);
}

const hooksDir = join(gitRoot, ".git", "hooks");
mkdirSync(hooksDir, { recursive: true });

const projectRel = relative(gitRoot, projectDir).replaceAll("\\", "/");
const hookPath = join(hooksDir, "pre-commit");
const body = `#!/bin/sh
set -e
cd "${projectRel}" || exit 1
npm run check:text
`;

writeFileSync(hookPath, body, "utf8");
try {
  chmodSync(hookPath, 0o755);
} catch {
  // Windows may ignore executable bits; Git for Windows still runs hook scripts.
}

console.log(`[git-hooks] installed ${hookPath}`);
