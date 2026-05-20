import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(root, "src");
const pattern = /^\/\* eslint-disable @typescript-eslint\/no-explicit-any \*\/\r?\n?/;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(srcDir)) {
  const raw = fs.readFileSync(file, "utf8");
  if (!pattern.test(raw)) continue;
  const next = raw.replace(pattern, "");
  if (next === raw) continue;
  fs.writeFileSync(file, next, "utf8");
  changed += 1;
  console.log("cleaned", path.relative(root, file));
}
console.log(`done: ${changed} file(s)`);
