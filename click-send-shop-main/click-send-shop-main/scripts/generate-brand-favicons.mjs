/**
 * 从 src/assets/logo-icon.png 生成 public 品牌 favicon。
 * 在仓库根目录执行：node server 下 sharp
 *   cd server && node ../click-send-shop-main/click-send-shop-main/scripts/generate-brand-favicons.mjs
 * 或：cd server && node -e "..." 见 README
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../server/package.json"));
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcIcon = path.join(root, "src/assets/logo-icon.png");
const publicDir = path.join(root, "public");

async function main() {
  await mkdir(publicDir, { recursive: true });
  const base = () =>
    sharp(srcIcon).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

  await base().resize(32, 32).webp({ quality: 92 }).toFile(path.join(publicDir, "favicon.webp"));
  await base().resize(32, 32).png().toFile(path.join(publicDir, "favicon-32x32.png"));
  await base().resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
  const icoPng = await base().resize(32, 32).png().toBuffer();
  await writeFile(path.join(publicDir, "favicon.ico"), icoPng);
  console.log("Brand favicons written to", publicDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
