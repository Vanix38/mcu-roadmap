import type { McuItem, McuStudio, McuTrack } from "./mcu";
import { MOVIE_CHAIN_WHITELIST, seriesBaseTitle } from "./mcu";

export type GridPos = { row: number; col: number };

/** Incrémenter quand la logique de grille change — force recentrage du graphe */
export const LAYOUT_REVISION = "2026-09-30-track-order-crossings-v2";

/** Première année de la grille : col 1 = 2000 */
export const GRID_BASE_YEAR = 2000;

/**
 * Ordre vertical des pistes (haut → bas).
 * Optimisé (blocs narratifs) pour ~64 croisements vs ~96 avant :
 * héros → branches → merge → TV SHIELD → post → Spider/Sony → Fox → street.
 */
export const TRACK_ROW_ORDER: readonly McuTrack[] = [
  // Héros Phase 1–3
  "iron",
  "falcon",
  "guardians",
  "antman",
  "cap",
  "thor",
  "hulk",
  // Branches avant convergence
  "animation",
  "wakanda",
  "series-misc",
  // Convergence
  "merge",
  // TV reliée aux films (Carter / AoS)
  "agent-carter",
  "shield",
  // Post-Endgame
  "cosmic",
  "mystic",
  "misc",
  "magic",
  // Spider-Man MCU + Loki + Sony
  "spidey",
  "loki",
  "raimi",
  "venom",
  "spider-misc",
  "amazing",
  "spiderverse",
  // Fox
  "deadpool",
  "fantastic",
  "wolverine",
  "xmen",
  // Street / jeunes
  "young-heroes",
  "street",
];

/** Ordre des studios au sein d'une piste (sous-lignes) */
const STUDIO_RANK: Record<McuStudio, number> = {
  marvel: 0,
  abc: 1,
  hulu: 2,
  freeform: 3,
  netflix: 4,
  fox: 5,
  sony: 6,
  "sony-animation": 7,
};

/** Ajustements manuels optionnels (sous-ligne forcée au sein de la piste) */
export const LANE_OVERRIDES: Record<string, number> = {};

/**
 * Sous-lignes exclusives (une famille = une lane), dans l'ordre haut → bas.
 * Remplace le packing par année pour ces pistes.
 */
export const TRACK_EXCLUSIVE_LANES: Partial<
  Record<McuTrack, readonly string[]>
> = {
  street: [
    "series:The Punisher",
    "series:Daredevil",
    "series:Daredevil: Born Again",
    "series:Jessica Jones",
    "series:Luke Cage",
    "series:Iron Fist",
    "series:Hawkeye",
    "series:Echo",
  ],
  "young-heroes": ["series:Cloak & Dagger", "series:Runaways"],
};

export type GridBuildOptions = {
  compact?: boolean;
  extraOverrides?: Record<string, GridPos>;
  trackOrder?: readonly McuTrack[];
  exclusiveLanes?: Partial<Record<McuTrack, readonly string[]>>;
};

/** Familles qui partagent la lane d'une autre (même sous-ligne) */
const TRACK_LANE_ALIASES: Partial<
  Record<McuTrack, Readonly<Record<string, string>>>
> = {
  street: {
    "series:The Defenders": "series:Daredevil",
    "item:punisher-one-last-kill-2026": "series:The Punisher",
  },
};

/** Familles placées seules sur la dernière sous-ligne de leur piste */
const TRACK_SOLO_FAMILIES: Partial<Record<McuTrack, readonly string[]>> = {
  magic: ["series:Vision Quest"],
  animation: ["series:X-Men '97"],
};

export function yearOf(item: Pick<McuItem, "releaseDate">) {
  return Number(item.releaseDate.slice(0, 4));
}

/** Colonne temps : 2000 → 1, 2001 → 2, … */
export function yearToCol(year: number) {
  return year - GRID_BASE_YEAR + 1;
}

const MOVIE_FAMILY_BY_ID = new Map<string, string>();
for (const whitelist of MOVIE_CHAIN_WHITELIST) {
  for (const id of whitelist) MOVIE_FAMILY_BY_ID.set(id, whitelist[0]);
}

/** Regroupe les saisons d'une série / films d'une franchise sur la même sous-ligne */
function familyKey(item: McuItem) {
  if (item.type === "series") return `series:${seriesBaseTitle(item.title)}`;
  const movieFamily = MOVIE_FAMILY_BY_ID.get(item.id);
  if (movieFamily) return `movies:${movieFamily}`;
  return `item:${item.id}`;
}

type Family = {
  key: string;
  members: McuItem[];
  years: Set<number>;
  firstYear: number;
  studioRank: number;
  order: number;
};

function buildFamilies(items: readonly McuItem[]): Family[] {
  const byKey = new Map<string, Family>();

  for (const item of items) {
    const key = familyKey(item);
    const year = yearOf(item);
    const existing = byKey.get(key);
    if (existing) {
      existing.members.push(item);
      existing.years.add(year);
      existing.firstYear = Math.min(existing.firstYear, year);
      existing.studioRank = Math.min(existing.studioRank, STUDIO_RANK[item.studio]);
      existing.order = Math.min(existing.order, item.order);
      continue;
    }
    byKey.set(key, {
      key,
      members: [item],
      years: new Set([year]),
      firstYear: year,
      studioRank: STUDIO_RANK[item.studio],
      order: item.order,
    });
  }

  return [...byKey.values()].sort(
    (a, b) =>
      a.studioRank - b.studioRank ||
      a.firstYear - b.firstYear ||
      a.order - b.order,
  );
}

/**
 * Attribue une sous-ligne (lane) par famille au sein d'une piste :
 * première lane libre sur toutes les années de la famille.
 * Si `exclusiveOrder` est fourni, chaque famille a sa propre lane (ordre donné).
 * `aliases` : famille → clé cible pour partager la même lane.
 * `soloKeys` : familles placées seules sur les dernières sous-lignes.
 */
function assignLanes(
  families: Family[],
  exclusiveOrder?: readonly string[],
  aliases?: Readonly<Record<string, string>>,
  soloKeys?: readonly string[],
): Map<string, number> {
  const laneByFamily = new Map<string, number>();
  const solo = new Set(soloKeys ?? []);

  if (exclusiveOrder) {
    const orderIndex = new Map(exclusiveOrder.map((key, i) => [key, i]));
    const primary = families.filter(
      (f) => !aliases?.[f.key] && !solo.has(f.key),
    );
    const sorted = [...primary].sort((a, b) => {
      const ai = orderIndex.get(a.key);
      const bi = orderIndex.get(b.key);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return a.firstYear - b.firstYear || a.order - b.order;
    });
    sorted.forEach((family, index) => {
      laneByFamily.set(family.key, index);
    });
    for (const family of families) {
      const target = aliases?.[family.key];
      if (!target) continue;
      const lane = laneByFamily.get(target);
      if (lane !== undefined) laneByFamily.set(family.key, lane);
      else laneByFamily.set(family.key, sorted.length);
    }
  } else {
    const laneYears: Set<number>[] = [];
    const primary = families.filter(
      (f) => !aliases?.[f.key] && !solo.has(f.key),
    );

    for (const family of primary) {
      const forced = family.members
        .map((m) => LANE_OVERRIDES[m.id])
        .find((lane) => lane !== undefined);

      let lane = forced ?? 0;
      if (forced === undefined) {
        while (
          laneYears[lane] &&
          [...family.years].some((year) => laneYears[lane].has(year))
        ) {
          lane += 1;
        }
      }

      laneYears[lane] ??= new Set();
      for (const year of family.years) laneYears[lane].add(year);
      laneByFamily.set(family.key, lane);
    }

    for (const family of families) {
      const target = aliases?.[family.key];
      if (!target) continue;
      const lane = laneByFamily.get(target);
      if (lane !== undefined) laneByFamily.set(family.key, lane);
    }
  }

  let nextSoloLane =
    Math.max(-1, ...[...laneByFamily.values()]) + 1;
  for (const key of soloKeys ?? []) {
    if (!families.some((f) => f.key === key)) continue;
    laneByFamily.set(key, nextSoloLane);
    nextSoloLane += 1;
  }

  return laneByFamily;
}

/**
 * Grille année × piste : col = année de sortie, row = piste (+ sous-lignes
 * quand plusieurs sorties la même année sur la même piste).
 */
export function buildYearTrackGrid(
  items: readonly McuItem[],
  options?: Pick<GridBuildOptions, "trackOrder" | "exclusiveLanes">,
): Record<string, GridPos> {
  const byTrack = new Map<McuTrack, McuItem[]>();
  for (const item of items) {
    const list = byTrack.get(item.track);
    if (list) list.push(item);
    else byTrack.set(item.track, [item]);
  }

  const trackOrder = options?.trackOrder ?? TRACK_ROW_ORDER;
  const exclusiveLanes = options?.exclusiveLanes ?? TRACK_EXCLUSIVE_LANES;

  const positions: Record<string, GridPos> = {};
  let rowCursor = 1;

  for (const track of trackOrder) {
    const trackItems = byTrack.get(track);
    if (!trackItems || trackItems.length === 0) continue;

    const families = buildFamilies(trackItems);
    const laneByFamily = assignLanes(
      families,
      exclusiveLanes[track],
      TRACK_LANE_ALIASES[track],
      TRACK_SOLO_FAMILIES[track],
    );
    let laneCount = 0;

    for (const family of families) {
      const lane = laneByFamily.get(family.key) ?? 0;
      laneCount = Math.max(laneCount, lane + 1);
      for (const member of family.members) {
        positions[member.id] = {
          row: rowCursor + lane,
          col: yearToCol(yearOf(member)),
        };
      }
    }

    rowCursor += laneCount;
  }

  return positions;
}

/** Compacte : lignes densifiées (sans trous), colonnes décalées au minimum (axe temps linéaire). */
export function compactGridPositions(
  positions: Record<string, GridPos>,
): Record<string, GridPos> {
  const entries = Object.entries(positions);
  if (entries.length === 0) return {};

  const rows = [...new Set(entries.map(([, pos]) => pos.row))].sort(
    (a, b) => a - b,
  );
  const rowIndex = new Map(rows.map((row, index) => [row, index + 1]));
  const minCol = Math.min(...entries.map(([, pos]) => pos.col));

  const result: Record<string, GridPos> = {};
  for (const [id, pos] of entries) {
    result[id] = {
      row: rowIndex.get(pos.row) ?? pos.row,
      col: pos.col - minCol + 1,
    };
  }
  return result;
}

/** Positions grille pour les items donnés (chaînes synthétiques incluses). */
export function getGridPositions(
  items: readonly McuItem[],
  options?: GridBuildOptions,
): Record<string, GridPos> {
  const positions = buildYearTrackGrid(items, {
    trackOrder: options?.trackOrder,
    exclusiveLanes: options?.exclusiveLanes,
  });

  if (options?.extraOverrides) {
    for (const [id, pos] of Object.entries(options.extraOverrides)) {
      if (items.some((item) => item.id === id)) positions[id] = { ...pos };
    }
  }

  if (options?.compact) return compactGridPositions(positions);
  return positions;
}

/** @deprecated Alias de getGridPositions */
export const solveGridPositions = getGridPositions;

export function formatGridPositions(positions: Record<string, GridPos>): string {
  const lines = Object.entries(positions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, pos]) => `  "${id}": { row: ${pos.row}, col: ${pos.col} },`);
  return `export const MCU_GRID_POSITIONS: Record<string, { row: number; col: number }> = {\n${lines.join("\n")}\n};`;
}
