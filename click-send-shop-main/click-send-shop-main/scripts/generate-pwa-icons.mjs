import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceCandidates = [
  path.join(root, "src/assets/logo-icon.png"),
  path.join(root, "src/assets/logo.png"),
];
const publicDir = path.join(root, "public");

async function pickSource() {
  for (const file of sourceCandidates) {
    try {
      await sharp(file).metadata();
      return file;
    } catch {
      // continue
    }
  }
  throw new Error("No source logo found for PWA icon generation.");
}

async function main() {
  await mkdir(publicDir, { recursive: true });
  const source = await pickSource();
  const base = sharp(source).resize(512, 512, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  });

  await base.clone().resize(192, 192).png().toFile(path.join(publicDir, "pwa-192x192.png"));
  await base.clone().resize(512, 512).png().toFile(path.join(publicDir, "pwa-512x512.png"));

  const logoWithSafeArea = await base
    .clone()
    .resize(340, 340, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 212, g: 175, b: 55, alpha: 1 },
    },
  })
    .composite([{ input: logoWithSafeArea, gravity: "center" }])
    .png()
    .toFile(path.join(publicDir, "pwa-maskable-512x512.png"));

  console.log("PWA icons generated from:", source);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
