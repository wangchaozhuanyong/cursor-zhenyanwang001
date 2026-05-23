/**
 * Revert tText() in module-level constants (before export default function).
 * Those must use plain Chinese keys; translate at render via Tx/tText in components.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function fixFile(filePath) {
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const exportIdx = lines.findIndex((l) => /^export default function /.test(l));
  if (exportIdx < 0) return false;

  let changed = false;
  for (let i = 0; i < exportIdx; i += 1) {
    const next = lines[i].replace(/tText\("([^"]*)"\)/g, '"$1"');
    if (next !== lines[i]) {
      lines[i] = next;
      changed = true;
    }
  }
  if (changed) writeFileSync(filePath, lines.join("\n"), "utf8");
  return changed;
}

let n = 0;
for (const f of [
  ...walk(join(ROOT, "src/modules/admin")),
  ...walk(join(ROOT, "src/components/admin")),
  join(ROOT, "src/layouts/AdminLayout.tsx"),
]) {
  if (fixFile(f)) {
    n += 1;
    console.log("fixed", f.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
  }
}
console.log(`[fix_module_level_ttext] ${n} files`);
