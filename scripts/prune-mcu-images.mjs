/**
 * Supprime les fichiers correctement nommés dans public/images/mcu/
 * ({id}.{webp|jpg|jpeg|png} avec id présent dans mcu.json).
 * Conserve les autres fichiers (à renommer ensuite).
 *
 * Usage:
 *   node scripts/prune-mcu-images.mjs          # aperçu (dry-run)
 *   node scripts/prune-mcu-images.mjs --delete # suppression réelle
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MCU_JSON = path.join(ROOT, "src", "data", "mcu.json");
const IMAGES_DIR = path.join(ROOT, "public", "images", "mcu");
const VALID_EXTENSIONS = new Set(["webp", "jpg", "jpeg", "png"]);
const KEEP_FILES = new Set(["README.md", ".gitkeep"]);

const shouldDelete = process.argv.includes("--delete");

const items = JSON.parse(fs.readFileSync(MCU_JSON, "utf8"));
const validIds = new Set(items.map((item) => item.id));

if (!fs.existsSync(IMAGES_DIR)) {
  console.error(`Dossier introuvable: ${IMAGES_DIR}`);
  process.exit(1);
}

const entries = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
const toDelete = [];
const kept = [];

for (const entry of entries) {
  if (!entry.isFile()) continue;
  if (KEEP_FILES.has(entry.name)) continue;

  const parsed = path.parse(entry.name);
  const ext = parsed.ext.slice(1).toLowerCase();
  const id = parsed.name;

  const isCorrectlyNamed = VALID_EXTENSIONS.has(ext) && validIds.has(id);

  if (isCorrectlyNamed) {
    toDelete.push(entry.name);
  } else {
    kept.push(entry.name);
  }
}

console.log(`IDs MCU: ${validIds.size}`);
console.log(`À conserver (mal nommées): ${kept.length}`);
console.log(`À supprimer (bien nommées): ${toDelete.length}`);

if (toDelete.length > 0) {
  console.log("\nFichiers à supprimer:");
  for (const file of toDelete.sort()) {
    console.log(`  - ${file}`);
  }
}

if (!shouldDelete) {
  if (toDelete.length > 0) {
    console.log("\nDry-run. Relancer avec --delete pour supprimer.");
  }
  process.exit(0);
}

for (const file of toDelete) {
  fs.unlinkSync(path.join(IMAGES_DIR, file));
}

console.log(`\n${toDelete.length} fichier(s) supprimé(s).`);
