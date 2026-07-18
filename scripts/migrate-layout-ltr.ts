/**
 * Génère les overrides LTR (swap row↔col) depuis LAYOUT_OVERRIDES actuel.
 * Usage: npx tsx scripts/migrate-layout-ltr.ts
 */

import { LAYOUT_OVERRIDES } from "../src/lib/layout-solver";

function formatRecord(name: string, record: Record<string, unknown>, nested = false) {
  const lines = Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, val]) => {
      if (nested && val && typeof val === "object" && "row" in val && "col" in val) {
        const p = val as { row: number; col: number };
        return `  "${id}": { row: ${p.col}, col: ${p.row} },`;
      }
      return `  "${id}": ${JSON.stringify(val)},`;
    });
  return `export const ${name} = {\n${lines.join("\n")}\n};`;
}

const LAYOUT_LTR: Record<string, { row: number; col: number }> = {};
for (const [id, pos] of Object.entries(LAYOUT_OVERRIDES)) {
  LAYOUT_LTR[id] = { row: pos.col, col: pos.row };
}

console.log("// LAYOUT_OVERRIDES (LTR)");
console.log(formatRecord("LAYOUT_OVERRIDES", LAYOUT_LTR, true));
