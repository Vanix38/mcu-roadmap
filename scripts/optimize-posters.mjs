/**
 * Génère des vignettes WebP + un manifeste d'extensions exactes.
 *
 * Usage:
 *   node scripts/optimize-posters.mjs
 *   node scripts/optimize-posters.mjs --force
 *
 * Sorties:
 *   public/images/mcu-thumbs/{id}.webp
 *   src/data/poster-manifest.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "public", "images", "mcu-wiki");
const THUMB_DIR = path.join(ROOT, "public", "images", "mcu-thumbs");
const MANIFEST_PATH = path.join(ROOT, "src", "data", "poster-manifest.json");
const MCU_JSON = path.join(ROOT, "src", "data", "mcu.json");

const EXT_PRIORITY = ["webp", "avif", "jpg", "jpeg", "png"];
const THUMB_WIDTH = 360;
const force = process.argv.includes("--force");

function findSourceFile(id) {
  for (const ext of EXT_PRIORITY) {
    const file = path.join(SRC_DIR, `${id}.${ext}`);
    if (fs.existsSync(file)) return { file, ext };
  }
  return null;
}

async function main() {
  const items = JSON.parse(fs.readFileSync(MCU_JSON, "utf8"));
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  /** @type {Record<string, { ext: string, thumb: boolean }>} */
  const manifest = {};
  let made = 0;
  let skipped = 0;
  let missing = 0;

  for (const item of items) {
    const source = findSourceFile(item.id);
    if (!source) {
      missing += 1;
      continue;
    }

    const thumbPath = path.join(THUMB_DIR, `${item.id}.webp`);
    let hasThumb = fs.existsSync(thumbPath);

    if (!hasThumb || force) {
      try {
        await sharp(source.file)
          .rotate()
          .resize({
            width: THUMB_WIDTH,
            height: Math.round(THUMB_WIDTH * 1.5),
            fit: "cover",
            position: "centre",
          })
          .webp({ quality: 72, effort: 4 })
          .toFile(thumbPath);
        hasThumb = true;
        made += 1;
      } catch (error) {
        console.warn(`thumb fail ${item.id}:`, error.message);
        hasThumb = false;
      }
    } else {
      skipped += 1;
    }

    manifest[item.id] = { ext: source.ext, thumb: hasThumb };
  }

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Posters: ${Object.keys(manifest).length} | thumbs new ${made} | cached ${skipped} | missing ${missing}`,
  );
  console.log(`Manifest → ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
