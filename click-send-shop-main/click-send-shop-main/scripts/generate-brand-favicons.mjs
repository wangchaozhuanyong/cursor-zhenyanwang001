/**
 * 从 public/favicon.svg 生成浏览器兼容用的 PNG/ICO favicon。
 * SVG 是现代浏览器首选，PNG/ICO 用于旧浏览器和部分桌面环境兜底。
 */
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../server/package.json"));
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const srcIcon = path.join(publicDir, "favicon.svg");

async function main() {
  await mkdir(publicDir, { recursive: true });
  const source = await readFile(srcIcon);
  const base = () =>
    sharp(source).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

  await base().resize(32, 32).webp({ quality: 92 }).toFile(path.join(publicDir, "favicon.webp"));
  await base().resize(32, 32).png().toFile(path.join(publicDir, "favicon-32x32.png"));
  // 安装图标仍由 /apple-touch-icon.png 动态生成，跟随后台配置的品牌图。
  const icoPng = await base().resize(32, 32).png().toBuffer();
  await writeFile(path.join(publicDir, "favicon.ico"), icoPng);
  console.log("Brand favicons written to", publicDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
