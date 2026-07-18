import data from "../src/data/mcu.json" assert { type: "json" };
import { McuDataSchema } from "../src/lib/mcu";
import { buildDependencyLayout } from "../src/lib/dependencies";
import { getGridPositions } from "../src/lib/layout-solver";

const items = McuDataSchema.parse(data);
const gridPositions = getGridPositions(items);
const byId = new Map(items.map((item) => [item.id, item]));
const errors: string[] = [];
const warnings: string[] = [];

for (const item of items) {
  if (!gridPositions[item.id]) {
    errors.push(`Position manquante: ${item.id}`);
  }
}

const colCounts = new Map<number, number>();
const cells = new Set<string>();
for (const [, pos] of Object.entries(gridPositions)) {
  colCounts.set(pos.col, (colCounts.get(pos.col) ?? 0) + 1);
  const cell = `${pos.row}:${pos.col}`;
  if (cells.has(cell)) errors.push(`Collision cellule ${cell}`);
  cells.add(cell);
}

for (const [col, count] of colCounts.entries()) {
  if (count > 4) warnings.push(`Colonne ${col}: ${count} nœuds (>4)`);
}

for (const item of items) {
  for (const depId of item.dependsOn) {
    const from = gridPositions[depId];
    const to = gridPositions[item.id];
    if (!from || !to) continue;
    if (to.col <= from.col) {
      errors.push(
        `${item.id}: col ${to.col} <= prérequis ${depId} col ${from.col}`,
      );
    }
    const span = Math.abs(to.row - from.row);
    const fromItem = byId.get(depId);
    const isXmenEdge = fromItem?.track === "xmen";
    const isConvergenceTarget =
      item.id === "deadpool-wolverine-2024" ||
      item.id === "avengers-doomsday-2026";
    const isMergeSpineSource =
      depId === "avengers-endgame-2019" ||
      depId === "avengers-infinity-war-2018";
    if (span > 8 && !isXmenEdge && !isConvergenceTarget && !isMergeSpineSource) {
      errors.push(`Span ${span}: ${depId} -> ${item.id}`);
    } else if (span > 8) {
      warnings.push(`Span ${span}: ${depId} -> ${item.id}`);
    } else if (span > 4) {
      warnings.push(`Span ${span}: ${depId} -> ${item.id}`);
    }
  }
}

const layout = buildDependencyLayout(items);
const crossingEdges = layout.edges.filter((e) => e.crossings.length > 0);
const col9 = Object.values(gridPositions).filter((p) => p.col === 9).length;

console.log("=== Layout validation (LTR) ===");
console.log("Positions:", Object.keys(gridPositions).length, "/", items.length);
console.log("Arêtes avec croisements:", crossingEdges.length, "/", layout.edges.length);
console.log("Nœuds colonne 9 (Endgame):", col9);
console.log("Canvas:", layout.width, "x", layout.height);
console.log("Erreurs:", errors.length);
console.log("Warnings:", warnings.length);
for (const e of errors.slice(0, 20)) console.log("  ERROR:", e);
for (const w of warnings.slice(0, 20)) console.log("  WARN:", w);

if (crossingEdges.length >= 15) {
  warnings.push(`Croisements ${crossingEdges.length} >= objectif 15`);
}

process.exit(errors.length > 0 ? 1 : 0);
