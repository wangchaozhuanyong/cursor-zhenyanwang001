import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BROKEN = /import \{\nimport \{ Tx \} from "@\/components\/admin\/AdminText";\nimport \{ useAdminT \} from "@\/hooks\/useAdminT";\n/g;
const FIXED =
  'import { Tx } from "@/components/admin/AdminText";\nimport { useAdminT } from "@/hooks/useAdminT";\nimport {\n';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let n = 0;
for (const f of [
  ...walk(join(ROOT, "src/modules/admin")),
  ...walk(join(ROOT, "src/components/admin")),
]) {
  let src = readFileSync(f, "utf8");
  if (!BROKEN.test(src)) continue;
  src = src.replace(BROKEN, FIXED);
  writeFileSync(f, src, "utf8");
  n += 1;
  console.log("fixed imports", f.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
}
console.log(`[fix-broken-i18n-imports] ${n} files`);
