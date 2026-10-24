import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/icons", { recursive: true });

const source = "public/icon.svg";
const background = { r: 23, g: 17, b: 13, alpha: 1 };

const png = (size) =>
  sharp(source).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 });

await png(512).toFile("public/icons/icon-512.png");
await png(192).toFile("public/icons/icon-192.png");
await png(180).toFile("public/apple-touch-icon.png");
await png(32).toFile("public/favicon-32.png");
await sharp(source).resize(32, 32).toFile("public/favicon.png");

// Maskable ikon: güvenli alan için %80 boyut + zemin.
const inner = await sharp(source).resize(410, 410, { fit: "cover" }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background } })
  .composite([{ input: inner, left: 51, top: 51 }])
  .png({ compressionLevel: 9 })
  .toFile("public/icons/maskable-512.png");

// SVG favicon (tarayıcılar için)
await sharp(source).resize(32, 32).png().toFile("public/favicon.png");

console.log("ikonlar üretildi");
