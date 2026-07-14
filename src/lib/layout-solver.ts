import type { McuItem, McuTrack } from "./mcu";

export type GridPos = { row: number; col: number };

/** Incrémenter quand LAYOUT_OVERRIDES change — force recentrage du graphe */
export const LAYOUT_REVISION = "2026-07-14-mom-nwh-bnd";

/** Premier film de chaque franchise Phase 1 — ordre vertical dans les colonnes de gauche */
const PREMIER_FILM_TRACKS: McuTrack[] = [
  "iron",
  "hulk",
  "cap",
  "thor",
  "antman",
  "guardians",
];

/** Colonnes de gauche où réordonner les premiers films */
const PREMIER_COL_MAX = 4;

/** Ligne de base par piste (axe vertical) */
export const TRACK_ROWS: Record<McuTrack, number> = {
  iron: 2,
  hulk: 6,
  cap: 1,
  merge: 4,
  thor: 5,
  guardians: 6,
  antman: 3,
  mystic: 14,
  spidey: 7,
  wakanda: 11,
  cosmic: 12,
  misc: 13,
  xmen: 25,
};

/** Ligne explicite par id (exceptions à la piste) */
export const ID_ROW_OVERRIDES: Record<string, number> = {
  "your-friendly-neighborhood-spiderman-s1-2025": 0,
  "doctor-strange-2016": 14,
  "doctor-strange-mom-2022": 17,
  "wandavision-2021": 10,
  "agatha-all-along-2024": 10,
  "loki-s1-2021": 14,
  "loki-s2-2023": 14,
  "moon-knight-2022": 14,
  "what-if-s1-2021": 15,
  "what-if-s2-2023": 15,
  "what-if-s3-2024": 15,
  "werewolf-by-night-2022": 14,
  "daredevil-born-again-s1-2025": 16,
  "daredevil-born-again-s2-2026": 16,
  "punisher-one-last-kill-2026": 15,
  "marvel-zombies-2025": 22,
  "wonder-man-2026": 13,
  "vision-quest-2026": 9,
  "spider-man-2002": 16,
  "spider-man-2-2004": 16,
  "spider-man-3-2007": 16,
  "the-amazing-spider-man-2012": 9,
  "the-amazing-spider-man-2-2014": 9,
  "venom-2018": 21,
  "venom-let-there-be-carnage-2021": 22,
  "venom-the-last-dance-2024": 22,
  "morbius-2022": 21,
  "madame-web-2024": 21,
  "kraven-the-hunter-2024": 21,
  "the-new-mutants-2020": 25,
  "deadpool-2016": 23,
  "deadpool-2-2018": 23,
  "deadpool-wolverine-2024": 23,
  "x-men-2000": 25,
  "x2-2003": 25,
  "x-men-last-stand-2006": 25,
  "x-men-origins-wolverine-2009": 24,
  "x-men-first-class-2011": 26,
  "the-wolverine-2013": 24,
  "x-men-days-of-future-past-2014": 26,
  "x-men-apocalypse-2016": 26,
  "logan-2017": 24,
  "x-men-dark-phoenix-2019": 26,
  "x-men-97-s1-2024": 26,
  "x-men-97-s2-2026": 26,
};

/**
 * Positions finales LTR — row = piste, col = temps.
 * Priorité sur l'algorithme automatique.
 */
export const LAYOUT_OVERRIDES: Record<string, GridPos> = {
  "agatha-all-along-2024": { row: 10, col: 13 },
  "ant-man-2015": { row: 7, col: 6 },
  "ant-man-and-the-wasp-2018": { row: 8, col: 8 },
  "ant-man-quantumania-2023": { row: 7, col: 10 },
  "avengers-age-of-ultron-2015": { row: 7, col: 5 },
  "avengers-doomsday-2026": { row: 4, col: 14 },
  "avengers-endgame-2019": { row: 14, col: 9 },
  "avengers-infinity-war-2018": { row: 14, col: 8 },
  "avengers-secret-wars-2027": { row: 4, col: 15 },
  "black-panther-2018": { row: 10, col: 7 },
  "black-panther-wakanda-forever-2022": { row: 11, col: 11 },
  "black-widow-2021": { row: 9, col: 7 },
  "captain-america-brave-new-world-2025": { row: 2, col: 11 },
  "captain-america-civil-war-2016": { row: 8, col: 6 },
  "captain-america-the-first-avenger-2011": { row: 3, col: 2 },
  "captain-america-the-winter-soldier-2014": { row: 7, col: 4 },
  "captain-marvel-2019": { row: 13, col: 8 },
  "daredevil-born-again-s1-2025": { row: 11, col: 12 },
  "daredevil-born-again-s2-2026": { row: 16, col: 14 },
  "deadpool-2-2018": { row: 23, col: 7 },
  "deadpool-2016": { row: 23, col: 6 },
  "deadpool-wolverine-2024": { row: 23, col: 13 },
  "doctor-strange-2016": { row: 13, col: 6 },
  "doctor-strange-mom-2022": { row: 17, col: 13 },
  "echo-2024": { row: 6, col: 15 },
  "eternals-2021": { row: 5, col: 14 },
  "eyes-of-wakanda-2025": { row: 10, col: 8 },
  "falcon-winter-soldier-2021": { row: 1, col: 10 },
  "fantastic-four-first-steps-2025": { row: 8, col: 13 },
  "gotg-holiday-special-2022": { row: 6, col: 12 },
  "guardians-of-the-galaxy-2014": { row: 14, col: 6 },
  "guardians-of-the-galaxy-vol-2-2017": { row: 14, col: 7 },
  "guardians-of-the-galaxy-vol-3-2023": { row: 6, col: 13 },
  "hawkeye-2021": { row: 5, col: 15 },
  "i-am-groot-2022": { row: 15, col: 8 },
  "i-am-groot-s2-2023": { row: 15, col: 9 },
  "iron-man-2-2010": { row: 2, col: 2 },
  "iron-man-2008": { row: 2, col: 1 },
  "iron-man-3-2013": { row: 5, col: 4 },
  "ironheart-2025": { row: 11, col: 11 },
  "kraven-the-hunter-2024": { row: 21, col: 4 },
  "logan-2017": { row: 24, col: 11 },
  "loki-s1-2021": { row: 8, col: 10 },
  "loki-s2-2023": { row: 14, col: 11 },
  "madame-web-2024": { row: 21, col: 3 },
  "marvel-zombies-2025": { row: 4, col: 12 },
  "moon-knight-2022": { row: 5, col: 13 },
  "morbius-2022": { row: 22, col: 2 },
  "ms-marvel-2022": { row: 13, col: 10 },
  "punisher-one-last-kill-2026": { row: 15, col: 14 },
  "secret-invasion-2023": { row: 14, col: 12 },
  "shang-chi-2021": { row: 5, col: 12 },
  "she-hulk-2022": { row: 7, col: 14 },
  "spider-man-2-2004": { row: 17, col: 9 },
  "spider-man-2002": { row: 17, col: 8 },
  "spider-man-3-2007": { row: 17, col: 10 },
  "spider-man-brand-new-day-2026": { row: 18, col: 13 },
  "spider-man-far-from-home-2019": { row: 14, col: 10 },
  "spider-man-homecoming-2017": { row: 11, col: 7 },
  "spider-man-no-way-home-2021": { row: 17, col: 12 },
  "the-amazing-spider-man-2-2014": { row: 16, col: 9 },
  "the-amazing-spider-man-2012": { row: 16, col: 8 },
  "the-avengers-2012": { row: 5, col: 3 },
  "the-incredible-hulk-2008": { row: 6, col: 2 },
  "the-marvels-2023": { row: 13, col: 11 },
  "the-new-mutants-2020": { row: 25, col: 2 },
  "the-wolverine-2013": { row: 24, col: 9 },
  "thor-2011": { row: 5, col: 2 },
  "thor-love-and-thunder-2022": { row: 5, col: 11 },
  "thor-ragnarok-2017": { row: 12, col: 6 },
  "thor-the-dark-world-2013": { row: 6, col: 4 },
  "thunderbolts-2025": { row: 1, col: 12 },
  "venom-2018": { row: 21, col: 2 },
  "venom-let-there-be-carnage-2021": { row: 22, col: 3 },
  "venom-the-last-dance-2024": { row: 22, col: 4 },
  "vision-quest-2026": { row: 9, col: 15 },
  "wandavision-2021": { row: 5, col: 10 },
  "werewolf-by-night-2022": { row: 10, col: 9 },
  "what-if-s1-2021": { row: 4, col: 11 },
  "what-if-s2-2023": { row: 9, col: 12 },
  "what-if-s3-2024": { row: 9, col: 13 },
  "wonder-man-2026": { row: 14, col: 13 },
  "x-men-2000": { row: 25, col: 6 },
  "x-men-97-s1-2024": { row: 26, col: 6 },
  "x-men-97-s2-2026": { row: 26, col: 7 },
  "x-men-apocalypse-2016": { row: 26, col: 11 },
  "x-men-dark-phoenix-2019": { row: 26, col: 12 },
  "x-men-days-of-future-past-2014": { row: 26, col: 10 },
  "x-men-first-class-2011": { row: 26, col: 8 },
  "x-men-last-stand-2006": { row: 25, col: 8 },
  "x-men-origins-wolverine-2009": { row: 24, col: 8 },
  "x2-2003": { row: 25, col: 7 },
  "your-friendly-neighborhood-spiderman-s1-2025": { row: 0, col: 7 },
};

const MAX_NODES_PER_COL = 4;

function rowFor(item: McuItem): number {
  return ID_ROW_OVERRIDES[item.id] ?? TRACK_ROWS[item.track];
}

function colOccupancy(positions: Record<string, GridPos>) {
  const byCol = new Map<number, number>();
  const byCell = new Set<string>();
  for (const pos of Object.values(positions)) {
    byCol.set(pos.col, (byCol.get(pos.col) ?? 0) + 1);
    byCell.add(`${pos.row}:${pos.col}`);
  }
  return { byCol, byCell };
}

function nextFreeCol(
  row: number,
  minCol: number,
  byCol: Map<number, number>,
  byCell: Set<string>,
): number {
  let col = minCol;
  while (true) {
    const cellTaken = byCell.has(`${row}:${col}`);
    const colFull = (byCol.get(col) ?? 0) >= MAX_NODES_PER_COL;
    if (!cellTaken && !colFull) return col;
    col += 1;
  }
}

function resolveCollisions(
  positions: Record<string, GridPos>,
  items: readonly McuItem[],
) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const maxPasses = 200;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const cells = new Map<string, string>();
    let collision: { id: string; other: string } | null = null;

    for (const [id, pos] of Object.entries(positions)) {
      const key = `${pos.row}:${pos.col}`;
      const other = cells.get(key);
      if (other) {
        collision = { id, other };
        break;
      }
      cells.set(key, id);
    }

    if (!collision) break;

    const a = byId.get(collision.id);
    const b = byId.get(collision.other);
    if (!a || !b) break;

    const bumpId = (() => {
      const aOverride = LAYOUT_OVERRIDES[collision.id];
      const bOverride = LAYOUT_OVERRIDES[collision.other];
      if (aOverride && !bOverride) return collision.id;
      if (bOverride && !aOverride) return collision.other;
      return a!.order >= b!.order ? collision.id : collision.other;
    })();
    positions[bumpId].row += 1;
  }
}

function minColFor(
  id: string,
  positions: Record<string, GridPos>,
  byId: Map<string, McuItem>,
) {
  const item = byId.get(id);
  if (!item) return 1;
  let minCol = 1;
  for (const depId of item.dependsOn) {
    const depPos = positions[depId];
    if (depPos) minCol = Math.max(minCol, depPos.col + 1);
  }
  return minCol;
}

function finalizeOverrides(
  positions: Record<string, GridPos>,
  items: readonly McuItem[],
) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const overrideIds = Object.keys(LAYOUT_OVERRIDES)
    .filter((id) => byId.has(id))
    .sort((a, b) => (byId.get(a)!.order - byId.get(b)!.order));

  for (let pass = 0; pass < overrideIds.length; pass += 1) {
    let changed = false;
    for (const id of overrideIds) {
      const override = LAYOUT_OVERRIDES[id];
      const col = Math.max(override.col, minColFor(id, positions, byId));
      const next = { row: override.row, col };
      const current = positions[id];
      if (!current || current.row !== next.row || current.col !== next.col) {
        positions[id] = next;
        changed = true;
      }
    }
    resolveCollisions(positions, items);
    if (!changed) break;
  }
}

function enforceDependencyCols(
  positions: Record<string, GridPos>,
  items: readonly McuItem[],
  skipIds: ReadonlySet<string> = new Set(),
) {
  const sorted = [...items].sort((a, b) => a.order - b.order);

  for (let pass = 0; pass < items.length; pass += 1) {
    let changed = false;
    for (const item of sorted) {
      if (skipIds.has(item.id)) continue;
      let minCol = 1;
      for (const depId of item.dependsOn) {
        const depPos = positions[depId];
        if (depPos) minCol = Math.max(minCol, depPos.col + 1);
      }
      const pos = positions[item.id];
      if (pos && pos.col < minCol) {
        pos.col = minCol;
        changed = true;
      }
    }
    resolveCollisions(positions, items);
    if (!changed) break;
  }
}

function premierFilmIds(items: readonly McuItem[]): Set<string> {
  const ids = new Set<string>();
  for (const track of PREMIER_FILM_TRACKS) {
    const first = items
      .filter((item) => item.track === track)
      .sort((a, b) => a.order - b.order)[0];
    if (first) ids.add(first.id);
  }
  return ids;
}

/** Premiers films d'une même colonne : plus vieux en haut, plus récent en bas */
function applyPremierFilmVerticalOrder(
  positions: Record<string, GridPos>,
  items: readonly McuItem[],
) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const premiers = premierFilmIds(items);
  const byCol = new Map<number, string[]>();

  for (const id of premiers) {
    const pos = positions[id];
    if (!pos || pos.col > PREMIER_COL_MAX) continue;
    const list = byCol.get(pos.col) ?? [];
    list.push(id);
    byCol.set(pos.col, list);
  }

  for (const ids of byCol.values()) {
    if (ids.length <= 1) continue;

    const sorted = ids.sort(
      (a, b) => byId.get(a)!.order - byId.get(b)!.order,
    );
    const baseRow = Math.min(...sorted.map((id) => positions[id].row));
    sorted.forEach((id, index) => {
      positions[id].row = baseRow + index;
    });
  }

  resolveCollisions(positions, items);
}

/** Calcule les positions grille pour tous les items (LTR) */
export function solveGridPositions(items: readonly McuItem[]): Record<string, GridPos> {
  const byId = new Map(items.map((item) => [item.id, item]));
  const positions: Record<string, GridPos> = {};

  for (const item of items) {
    const override = LAYOUT_OVERRIDES[item.id];
    if (override) positions[item.id] = { ...override };
  }

  const sorted = [...items].sort((a, b) => a.order - b.order);
  for (const item of sorted) {
    if (positions[item.id]) continue;

    const row = rowFor(item);
    let minCol = 1 + Math.floor((item.order - 1) / 14);

    for (const depId of item.dependsOn) {
      const depPos = positions[depId];
      if (depPos) minCol = Math.max(minCol, depPos.col + 1);
    }

    const { byCol, byCell } = colOccupancy(positions);
    const col = nextFreeCol(row, minCol, byCol, byCell);
    positions[item.id] = { row, col };
  }

  for (const [id, pos] of Object.entries(LAYOUT_OVERRIDES)) {
    if (byId.has(id)) positions[id] = { ...pos };
  }

  resolveCollisions(positions, items);
  enforceDependencyCols(
    positions,
    items,
    new Set(Object.keys(LAYOUT_OVERRIDES)),
  );
  finalizeOverrides(positions, items);
  applyPremierFilmVerticalOrder(positions, items);
  enforceDependencyCols(positions, items);

  return positions;
}

/** Formate MCU_GRID_POSITIONS pour insertion dans grid-layout.ts */
export function formatGridPositions(positions: Record<string, GridPos>): string {
  const lines = Object.entries(positions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, pos]) => `  "${id}": { row: ${pos.row}, col: ${pos.col} },`);
  return `export const MCU_GRID_POSITIONS: Record<string, { row: number; col: number }> = {\n${lines.join("\n")}\n};`;
}
