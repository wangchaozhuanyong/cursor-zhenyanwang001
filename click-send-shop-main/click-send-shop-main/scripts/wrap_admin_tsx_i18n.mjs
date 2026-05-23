/**
 * Wrap Chinese UI copy in admin TSX with <Tx> / tText() for English locale.
 * Run: node scripts/wrap_admin_tsx_i18n.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TARGETS = [
  join(ROOT, "src/modules/admin"),
  join(ROOT, "src/components/admin"),
  join(ROOT, "src/layouts/AdminLayout.tsx"),
  join(ROOT, "src/components/SkinPickerDialog.tsx"),
];

const SKIP_FILES = new Set([
  "AdminText.tsx",
  "AdminTableCell.tsx",
]);

const CJK = /[\u4e00-\u9fff]/;

function walk(entry, out = []) {
  if (!existsSync(entry)) return out;
  if (statSync(entry).isFile()) {
    if (entry.endsWith(".tsx")) out.push(entry);
    return out;
  }
  for (const name of readdirSync(entry)) {
    walk(join(entry, name), out);
  }
  return out;
}

function hasCjk(s) {
  return CJK.test(s);
}

function ensureImports(src) {
  let next = src;
  if (!next.includes('from "@/components/admin/AdminText"')) {
    const idx = next.lastIndexOf("\nimport ");
    const insertAt = idx >= 0 ? next.indexOf("\n", idx + 1) + 1 : 0;
    next =
      next.slice(0, insertAt)
      + 'import { Tx } from "@/components/admin/AdminText";\n'
      + next.slice(insertAt);
  }
  if (!next.includes('from "@/hooks/useAdminT"')) {
    const idx = next.lastIndexOf("\nimport ");
    const insertAt = idx >= 0 ? next.indexOf("\n", idx + 1) + 1 : 0;
    next =
      next.slice(0, insertAt)
      + 'import { useAdminT } from "@/hooks/useAdminT";\n'
      + next.slice(insertAt);
  }
  return next;
}

function injectTTextHook(src) {
  if (src.includes("const { tText } = useAdminT()")) return src;
  const re = /export default function (\w+)\([^)]*\)\s*\{/;
  const m = src.match(re);
  if (!m) return src;
  const insertPos = m.index + m[0].length;
  return `${src.slice(0, insertPos)}\n  const { tText } = useAdminT();${src.slice(insertPos)}`;
}

function wrapJsxTextNodes(src) {
  return src.replace(/>([^<>{}\n]*[\u4e00-\u9fff][^<>{}\n]*)</g, (full, inner) => {
    const text = inner.trim();
    if (!text || text.includes("Tx>") || text.includes("{")) return full;
    if (text.startsWith("/")) return full;
    return `><Tx>${text}</Tx><`;
  });
}

function wrapStringProps(src) {
  const props = ["placeholder", "title", "aria-label", "label"];
  let next = src;
  for (const prop of props) {
    const re = new RegExp(`\\b${prop}="([^"]*[\u4e00-\u9fff][^"]*)"`, "g");
    next = next.replace(re, `${prop}={tText("$1")}`);
  }
  return next;
}

function wrapToastAndConfirm(src) {
  let next = src;
  next = next.replace(
    /toast\.(success|error|info|warning)\("([^"]*[\u4e00-\u9fff][^"]*)"\)/g,
    'toast.$1(tText("$2"))',
  );
  next = next.replace(
    /confirm\(\{\s*title:\s*"([^"]*[\u4e00-\u9fff][^"]*)"/g,
    'confirm({ title: tText("$1")',
  );
  next = next.replace(
    /confirm\(\{\s*title:\s*tText\("[^"]*"\),\s*message:\s*"([^"]*[\u4e00-\u9fff][^"]*)"/g,
    (m, msg) => m.replace(`message: "${msg}"`, `message: tText("${msg}")`),
  );
  return next;
}

function wrapOptionLabels(src) {
  return src.replace(
    /label:\s*"([^"]*[\u4e00-\u9fff][^"]*)"/g,
    'label: tText("$1")',
  );
}

function processFile(filePath) {
  const base = filePath.split(/[/\\]/).pop();
  if (SKIP_FILES.has(base)) return false;

  let src = readFileSync(filePath, "utf8");
  if (!hasCjk(src)) return false;

  const original = src;
  const needsHook =
    hasCjk(src)
    && (
      /label:\s*"[^"]*[\u4e00-\u9fff]/.test(src)
      || /(?:placeholder|title|aria-label)=["'][^"']*[\u4e00-\u9fff]/.test(src)
      || /toast\.(?:success|error)\("[^"]*[\u4e00-\u9fff]/.test(src)
    );

  src = wrapJsxTextNodes(src);
  if (needsHook || src.includes("<Tx>")) {
    src = ensureImports(src);
    if (needsHook || /tText\(/.test(src)) {
      src = injectTTextHook(src);
      src = wrapStringProps(src);
      src = wrapToastAndConfirm(src);
      src = wrapOptionLabels(src);
    } else if (src.includes("<Tx>") && !src.includes("AdminText")) {
      src = ensureImports(src);
    }
  }

  if (src !== original) {
    writeFileSync(filePath, src, "utf8");
    return true;
  }
  return false;
}

const files = TARGETS.flatMap((t) => (statSync(t).isFile() ? [t] : walk(t)));
let changed = 0;
for (const f of files) {
  if (processFile(f)) {
    changed += 1;
    console.log("wrapped", f.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
  }
}
console.log(`[wrap_admin_tsx_i18n] updated ${changed} files`);
