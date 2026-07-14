/**
 * Génère les overrides LTR (swap row↔col) depuis layout-solver actuel.
 * Usage: npx tsx scripts/migrate-layout-ltr.ts
 */

import {
  ID_ROW_OVERRIDES,
  LAYOUT_OVERRIDES,
  TRACK_ROWS,
  type GridPos,
} from "../src/lib/layout-solver";

function swapPos(pos: GridPos): GridPos {
  return { row: pos.col, col: pos.row };
}

function formatRecord(
  name: string,
  entries: Record<string, number | GridPos>,
  isPos = false,
) {
  const lines = Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, val]) => {
      if (isPos) {
        const p = val as GridPos;
        return `  "${id}": { row: ${p.row}, col: ${p.col} },`;
      }
      return `  ${id}: ${val},`;
    });
  return `export const ${name} = {\n${lines.join("\n")}\n};`;
}

const TRACK_ROWS_OUT = TRACK_ROWS;
const ID_ROW_OVERRIDES_OUT = ID_ROW_OVERRIDES;
const LAYOUT_LTR: Record<string, GridPos> = {};
for (const [id, pos] of Object.entries(LAYOUT_OVERRIDES)) {
  LAYOUT_LTR[id] = swapPos(pos);
}

console.log("// TRACK_ROWS");
console.log(formatRecord("TRACK_ROWS", TRACK_ROWS_OUT));
console.log("\n// ID_ROW_OVERRIDES");
console.log(formatRecord("ID_ROW_OVERRIDES", ID_ROW_OVERRIDES_OUT));
console.log("\n// LAYOUT_OVERRIDES (LTR)");
console.log(formatRecord("LAYOUT_OVERRIDES", LAYOUT_LTR, true));
