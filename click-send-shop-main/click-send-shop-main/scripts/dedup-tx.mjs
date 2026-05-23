import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const roots = [
  join(ROOT, "src/modules/admin"),
  join(ROOT, "src/components/admin"),
  join(ROOT, "src/layouts"),
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let changed = 0;
for (const root of roots) {
  if (!statSync(root).isDirectory() && root.endsWith(".tsx")) {
    var files = [root];
  } else {
    var files = walk(root);
  }
  for (const file of files) {
    let src = readFileSync(file, "utf8");
    const orig = src;
    while (src.includes("<Tx><Tx>")) {
      src = src.replaceAll("<Tx><Tx>", "<Tx>").replaceAll("</Tx></Tx>", "</Tx>");
    }
    if (src !== orig) {
      writeFileSync(file, src, "utf8");
      changed += 1;
    }
  }
}
console.log(`[dedup-tx] fixed ${changed} files`);
