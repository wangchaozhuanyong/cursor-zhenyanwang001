import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const assetsDir = path.join(distDir, "assets");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const assets = await readdir(assetsDir);
  const javascriptAssets = assets.filter((name) => name.endsWith(".js"));

  assert(
    javascriptAssets.length > 0,
    "Storefront runtime verification found no JavaScript assets; build the storefront before verification.",
  );

  assert(
    !javascriptAssets.some((name) => name.startsWith("vendor-next-themes-")),
    "Storefront bundle must not include the retired next-themes runtime.",
  );

  const storefrontCode = (
    await Promise.all(
      javascriptAssets.map((name) => readFile(path.join(assetsDir, name), "utf8")),
    )
  ).join("\n");

  assert(
    !storefrontCode.includes("/theme/skins"),
    "Storefront bundle must not request the retired runtime skin endpoint.",
  );
  assert(
    !storefrontCode.includes("theme_preview_draft"),
    "Storefront bundle must not include legacy skin preview runtime.",
  );

  console.log(`Fixed storefront runtime verification passed (${javascriptAssets.length} JS assets scanned).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
