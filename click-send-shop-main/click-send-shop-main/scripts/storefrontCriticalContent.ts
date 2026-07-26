import fs from "node:fs";
import path from "node:path";

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"] as const;
const CODE_EXTENSION_SET = new Set<string>(CODE_EXTENSIONS);
const STATIC_IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g;

const STOREFRONT_CRITICAL_ENTRIES = [
  "src/main.tsx",
  "src/StoreApp.tsx",
  "src/contexts/ThemeRuntimeProvider.tsx",
  "src/modules/storefront-v2/home/StoreHomeV2.tsx",
  "src/modules/storefront-v2/home/HomeProductSectionV2.tsx",
  "src/components/BannerCarousel.tsx",
  "src/components/GuestMobileFooter.tsx",
  "src/components/store/StoreDesktopHeader.tsx",
  "src/components/store/StoreTabletBar.tsx",
  "src/components/CookieConsentBanner.tsx",
  "src/components/TrackingManager.tsx",
  "src/components/ChinaBrowserCompatNotice.tsx",
  "src/components/PwaUpdateToast.tsx",
] as const;

function resolveSourceImport(projectRoot: string, fromFile: string, specifier: string) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;

  const base = specifier.startsWith("@/")
    ? path.join(projectRoot, "src", specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const extension = path.extname(base);
  if (extension && !CODE_EXTENSION_SET.has(extension)) return null;

  const candidates = extension
    ? [base]
    : [
        base,
        ...CODE_EXTENSIONS.map((value) => `${base}${value}`),
        ...CODE_EXTENSIONS.map((value) => path.join(base, `index${value}`)),
      ];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

export function resolveStorefrontContent(
  entryFiles: readonly string[],
  projectRoot = process.cwd(),
) {
  const pending = entryFiles.map((file) => path.join(projectRoot, file));
  const visited = new Set<string>();

  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);

    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(STATIC_IMPORT_RE)) {
      const resolved = resolveSourceImport(projectRoot, file, match[1]);
      if (resolved && !visited.has(resolved)) pending.push(resolved);
    }
  }

  return [...visited]
    .filter((file) => CODE_EXTENSION_SET.has(path.extname(file)))
    .map((file) => `./${path.relative(projectRoot, file).split(path.sep).join("/")}`)
    .sort();
}

export function resolveStorefrontCriticalContent(projectRoot = process.cwd()) {
  return [
    "./index.html",
    ...resolveStorefrontContent(STOREFRONT_CRITICAL_ENTRIES, projectRoot),
  ];
}
