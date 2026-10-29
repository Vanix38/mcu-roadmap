/**
 * Cherche un ordre vertical des pistes (et des sous-lignes Street) qui minimise
 * les croisements pondérés (nécessaire × nécessaire ≫ avec un optionnel), plus
 * une petite pénalité sur la longueur verticale des liens.
 *
 * Usage:
 *   npm run layout:optimize
 *   npm run layout:optimize -- --kicks=20 --seed=7
 */

import data from "../src/data/mcu.json" assert { type: "json" };
import { McuDataSchema, MCU_TRACKS, type McuTrack } from "../src/lib/mcu";
import { buildCollapsedLayout } from "../src/lib/collapsed-layout";
import { measureCrossings, type CrossingStats } from "../src/lib/crossing-cost";
import { TRACK_EXCLUSIVE_LANES, TRACK_ROW_ORDER } from "../src/lib/layout-solver";
import { filterByUniverse, type UniverseId } from "../src/lib/universe";

const items = McuDataSchema.parse(data);

function readNumberArg(name: string, fallback: number) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  const value = arg ? Number(arg.split("=")[1]) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

const KICKS = readNumberArg("kicks", 12);
let seed = readNumberArg("seed", 42);

function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

/** Poids par univers (MCU = vue par défaut) */
const UNIVERSE_WEIGHTS: Partial<Record<UniverseId, number>> = {
  mcu: 3,
  all: 3,
  tv: 1,
  fox: 1,
  sony: 1,
  legacy: 0.5,
};

const scenarios = Object.entries(UNIVERSE_WEIGHTS).map(([universe, weight]) => {
  const id = universe as UniverseId;
  return {
    universe: id,
    weight: weight ?? 0,
    items: filterByUniverse(items, id),
    collapseMovies: id !== "fox" && id !== "sony",
    collapseSeries: id !== "tv",
  };
});

type State = { tracks: McuTrack[]; street: string[] };
type Score = { total: number; perUniverse: Record<string, CrossingStats> };

function evaluate(state: State): Score {
  let total = 0;
  const perUniverse: Record<string, CrossingStats> = {};
  for (const scenario of scenarios) {
    const layout = buildCollapsedLayout(scenario.items, {
      trackOrder: state.tracks,
      exclusiveLanes: { ...TRACK_EXCLUSIVE_LANES, street: state.street },
      collapseMovies: scenario.collapseMovies,
      collapseSeries: scenario.collapseSeries,
    });
    const stats = measureCrossings(layout);
    perUniverse[scenario.universe] = stats;
    total += stats.cost * scenario.weight;
  }
  return { total, perUniverse };
}

function move<T>(list: readonly T[], from: number, to: number) {
  const next = [...list];
  const [value] = next.splice(from, 1);
  next.splice(to, 0, value);
  return next;
}

/** Déplace le bloc contigu [from, from + size) pour qu'il commence à `to` */
function moveBlock<T>(list: readonly T[], from: number, size: number, to: number) {
  const next = [...list];
  const block = next.splice(from, size);
  next.splice(to, 0, ...block);
  return next;
}

const MAX_BLOCK_SIZE = 4;

function localSearch(start: State, startScore: Score) {
  let state = start;
  let score = startScore;
  let improved = true;

  while (improved) {
    improved = false;
    for (const key of ["tracks", "street"] as const) {
      const maxSize = key === "tracks" ? MAX_BLOCK_SIZE : 1;
      for (let size = 1; size <= maxSize; size += 1) {
        const list = state[key] as readonly string[];
        for (let from = 0; from + size <= list.length; from += 1) {
          for (let to = 0; to + size <= list.length; to += 1) {
            if (from === to) continue;
            const current = state[key] as readonly string[];
            const candidate = {
              ...state,
              [key]: size === 1 ? move(current, from, to) : moveBlock(current, from, size, to),
            } as State;
            const candidateScore = evaluate(candidate);
            if (candidateScore.total < score.total - 1e-6) {
              state = candidate;
              score = candidateScore;
              improved = true;
            }
          }
        }
      }
    }
  }

  return { state, score };
}

function kick(state: State): State {
  let tracks = [...state.tracks];
  const moves = 2 + Math.floor(random() * 3);
  for (let i = 0; i < moves; i += 1) {
    const from = Math.floor(random() * tracks.length);
    const to = Math.floor(random() * tracks.length);
    tracks = move(tracks, from, to);
  }
  return { ...state, tracks };
}

function format(score: Score) {
  return Object.entries(score.perUniverse)
    .map(
      ([universe, s]) =>
        `${universe}: req ${s.required} / mixte ${s.mixed} / opt ${s.optional} — rangées req ${s.requiredSpan.toFixed(0)} / opt ${s.optionalSpan.toFixed(0)}`,
    )
    .join("\n  ");
}

const missing = MCU_TRACKS.filter((track) => !TRACK_ROW_ORDER.includes(track));
const initial: State = {
  tracks: [...TRACK_ROW_ORDER, ...missing],
  street: [...(TRACK_EXCLUSIVE_LANES.street ?? [])],
};
const initialScore = evaluate(initial);
console.log(`Départ: coût ${initialScore.total.toFixed(1)}\n  ${format(initialScore)}`);

const started = Date.now();
let best = localSearch(initial, initialScore);
console.log(`Recherche locale: ${best.score.total.toFixed(1)}`);

for (let i = 1; i <= KICKS; i += 1) {
  const kicked = kick(best.state);
  const result = localSearch(kicked, evaluate(kicked));
  const better = result.score.total < best.score.total - 1e-6;
  if (better) best = result;
  console.log(
    `Kick ${i}/${KICKS}: ${result.score.total.toFixed(1)}${better ? " ★" : ""} (${((Date.now() - started) / 1000).toFixed(0)} s)`,
  );
}

console.log(`\nFinal: coût ${best.score.total.toFixed(1)}\n  ${format(best.score)}`);
console.log("\nexport const TRACK_ROW_ORDER: readonly McuTrack[] = [");
for (const track of best.state.tracks) console.log(`  "${track}",`);
console.log("];\n\nstreet: [");
for (const family of best.state.street) console.log(`  "${family}",`);
console.log("],");
