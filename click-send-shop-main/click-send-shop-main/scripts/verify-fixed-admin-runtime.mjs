import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const assetsDir = path.resolve(process.cwd(), "admin-dist", "assets");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const assets = await readdir(assetsDir);
  const javascriptAssets = assets.filter((name) => name.endsWith(".js"));

  assert(
    javascriptAssets.length > 0,
    "Admin runtime verification found no JavaScript assets; build the admin app before verification.",
  );

  assert(
    !javascriptAssets.some((name) => name.startsWith("vendor-next-themes-")),
    "Admin bundle must use its independent fixed appearance runtime, not next-themes.",
  );

  const adminCode = (
    await Promise.all(
      javascriptAssets.map((name) => readFile(path.join(assetsDir, name), "utf8")),
    )
  ).join("\n");

  [
    "/theme/skins",
    "theme_cached_skins",
    "theme_preview_draft",
  ].forEach((fragment) => {
    assert(
      !adminCode.includes(fragment),
      `Admin bundle must not include retired client skin runtime fragment: ${fragment}`,
    );
  });

  console.log(`Fixed admin runtime verification passed (${javascriptAssets.length} JS assets scanned).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
