/**
 * Exporte les positions du solver (debug / snapshot).
 * Le runtime utilise solveGridPositions() directement — pas besoin de ce script pour l'app.
 *
 * Usage: npm run layout:generate
 */

import data from "../src/data/mcu.json" assert { type: "json" };
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McuDataSchema } from "../src/lib/mcu";
import { formatGridPositions, solveGridPositions } from "../src/lib/layout-solver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const items = McuDataSchema.parse(data);
const positions = solveGridPositions(items);

const outPath = path.join(ROOT, "grid-positions.snapshot.json");
fs.writeFileSync(outPath, JSON.stringify(positions, null, 2));

console.log(`Snapshot: ${outPath} (${Object.keys(positions).length} positions)`);
console.log(formatGridPositions(positions));
