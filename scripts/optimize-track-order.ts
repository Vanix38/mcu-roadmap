/**
 * Optimise TRACK_ROW_ORDER + sous-lignes street pour minimiser les croisements.
 * Usage: npx tsx scripts/optimize-track-order.ts
 */
import itemsJson from "../src/data/mcu.json" with { type: "json" };
import { buildCollapsedLayout } from "../src/lib/collapsed-layout";
import {
  TRACK_EXCLUSIVE_LANES,
  TRACK_ROW_ORDER,
} from "../src/lib/layout-solver";
import type { McuItem, McuTrack } from "../src/lib/mcu";

const items = itemsJson as McuItem[];

function countCrossings(
  trackOrder: readonly McuTrack[],
  exclusiveLanes: Partial<Record<McuTrack, readonly string[]>>,
) {
  const layout = buildCollapsedLayout(items, {
    compact: false,
    collapseMovies: true,
    collapseSeries: true,
    trackOrder,
    exclusiveLanes,
  });
  let crossings = 0;
  for (const edge of layout.edges) crossings += edge.crossings.length;
  return { crossings, edges: layout.edges.length };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** xorshift32 */
function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function swap<T>(arr: T[], i: number, j: number) {
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function moveIndex<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function reverseRange<T>(arr: T[], i: number, j: number) {
  const next = arr.slice();
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  for (let a = lo, b = hi; a < b; a++, b--) {
    [next[a], next[b]] = [next[b], next[a]];
  }
  return next;
}

/** Blocs à garder contigus (réordonnables entre eux et en interne) */
const SOFT_BLOCKS: readonly (readonly McuTrack[])[] = [
  ["iron", "hulk", "thor", "cap", "falcon", "agent-carter", "guardians", "antman"],
  ["animation", "wakanda", "series-misc"],
  ["merge"],
  ["cosmic", "mystic", "magic", "misc"],
  ["spidey", "shield"],
  ["raimi", "amazing", "loki", "venom", "spider-misc", "spiderverse"],
  ["deadpool", "wolverine", "xmen", "fantastic"],
  ["street", "young-heroes"],
];

function orderToBlocks(order: readonly McuTrack[]): McuTrack[][] {
  const remaining = new Set(order);
  const blocks: McuTrack[][] = [];
  for (const block of SOFT_BLOCKS) {
    const present = block.filter((t) => remaining.has(t));
    if (present.length === 0) continue;
    // garder l'ordre relatif actuel des membres du bloc
    const sorted = order.filter((t) => present.includes(t));
    for (const t of sorted) remaining.delete(t);
    blocks.push(sorted);
  }
  for (const t of order) {
    if (!remaining.has(t)) continue;
    remaining.delete(t);
    blocks.push([t]);
  }
  return blocks;
}

function flattenBlocks(blocks: readonly (readonly McuTrack[])[]): McuTrack[] {
  return blocks.flatMap((b) => [...b]);
}

function annealTracks(
  initial: readonly McuTrack[],
  exclusiveLanes: Partial<Record<McuTrack, readonly string[]>>,
  opts: {
    seed: number;
    iterations: number;
    keepBlocks: boolean;
    label: string;
  },
) {
  const rand = makeRng(opts.seed);
  let current = [...initial];
  let currentScore = countCrossings(current, exclusiveLanes).crossings;
  let best = current;
  let bestScore = currentScore;
  const t0 = 8;
  const t1 = 0.05;

  for (let i = 0; i < opts.iterations; i++) {
    const t = t0 * Math.pow(t1 / t0, i / opts.iterations);
    let next: McuTrack[];

    if (opts.keepBlocks) {
      const blocks = orderToBlocks(current);
      const r = rand();
      if (r < 0.45 && blocks.length >= 2) {
        const a = Math.floor(rand() * blocks.length);
        let b = Math.floor(rand() * blocks.length);
        if (b === a) b = (b + 1) % blocks.length;
        next = flattenBlocks(swap(blocks, a, b));
      } else if (r < 0.75) {
        const bi = Math.floor(rand() * blocks.length);
        const block = blocks[bi];
        if (block.length < 2) {
          const a = Math.floor(rand() * blocks.length);
          let b = Math.floor(rand() * blocks.length);
          if (b === a) b = (b + 1) % blocks.length;
          next = flattenBlocks(swap(blocks, a, b));
        } else {
          const a = Math.floor(rand() * block.length);
          let b = Math.floor(rand() * block.length);
          if (b === a) b = (b + 1) % block.length;
          const nb = [...blocks];
          nb[bi] = swap(block, a, b);
          next = flattenBlocks(nb);
        }
      } else {
        const a = Math.floor(rand() * blocks.length);
        let b = Math.floor(rand() * blocks.length);
        if (b === a) b = (b + 1) % blocks.length;
        next = flattenBlocks(moveIndex(blocks, a, b));
      }
    } else {
      const r = rand();
      if (r < 0.55) {
        const a = Math.floor(rand() * current.length);
        let b = Math.floor(rand() * current.length);
        if (b === a) b = (b + 1) % current.length;
        next = swap(current, a, b);
      } else if (r < 0.85) {
        const a = Math.floor(rand() * current.length);
        let b = Math.floor(rand() * current.length);
        if (b === a) b = (b + 1) % current.length;
        next = moveIndex(current, a, b);
      } else {
        const a = Math.floor(rand() * current.length);
        let b = Math.floor(rand() * current.length);
        if (b === a) b = (b + 1) % current.length;
        next = reverseRange(current, a, b);
      }
    }

    const score = countCrossings(next, exclusiveLanes).crossings;
    const accept =
      score <= currentScore || rand() < Math.exp((currentScore - score) / t);
    if (accept) {
      current = next;
      currentScore = score;
      if (score < bestScore) {
        best = next;
        bestScore = score;
      }
    }
  }

  console.log(
    `${opts.label}: best=${bestScore} (start seed run ended ${currentScore})`,
  );
  return { order: best, crossings: bestScore };
}

function annealStreetLanes(
  trackOrder: readonly McuTrack[],
  baseLanes: Partial<Record<McuTrack, readonly string[]>>,
  seed: number,
  iterations: number,
) {
  const street = [...(baseLanes.street ?? TRACK_EXCLUSIVE_LANES.street!)];
  const rand = makeRng(seed);
  let current = street;
  let lanes = { ...baseLanes, street: current };
  let currentScore = countCrossings(trackOrder, lanes).crossings;
  let best = current;
  let bestScore = currentScore;
  const t0 = 5;
  const t1 = 0.05;

  for (let i = 0; i < iterations; i++) {
    const t = t0 * Math.pow(t1 / t0, i / iterations);
    const a = Math.floor(rand() * current.length);
    let b = Math.floor(rand() * current.length);
    if (b === a) b = (b + 1) % current.length;
    const r = rand();
    const next =
      r < 0.7 ? swap(current, a, b) : moveIndex(current, a, b);
    const nextLanes = { ...baseLanes, street: next };
    const score = countCrossings(trackOrder, nextLanes).crossings;
    if (
      score <= currentScore ||
      rand() < Math.exp((currentScore - score) / t)
    ) {
      current = next;
      currentScore = score;
      lanes = nextLanes;
      if (score < bestScore) {
        best = next;
        bestScore = score;
      }
    }
  }

  console.log(`street lanes: best=${bestScore}`);
  return { street: best, crossings: bestScore };
}

/** Heuristique barycentre : ordre des pistes par médiane des voisins */
function barycenterOrder(
  initial: readonly McuTrack[],
  exclusiveLanes: Partial<Record<McuTrack, readonly string[]>>,
  rounds: number,
) {
  const layout = buildCollapsedLayout(items, {
    compact: false,
    collapseMovies: true,
    collapseSeries: true,
    trackOrder: initial,
    exclusiveLanes,
  });

  const trackOf = new Map<string, McuTrack>();
  const yOf = new Map<string, number>();
  for (const node of layout.nodes) {
    trackOf.set(node.item.id, node.item.track);
    yOf.set(node.item.id, node.y);
  }

  // poids d'arêtes inter-pistes
  const neighbors = new Map<McuTrack, McuTrack[]>();
  for (const edge of layout.edges) {
    const a = trackOf.get(edge.from);
    const b = trackOf.get(edge.to);
    if (!a || !b || a === b) continue;
    const la = neighbors.get(a) ?? [];
    la.push(b);
    neighbors.set(a, la);
    const lb = neighbors.get(b) ?? [];
    lb.push(a);
    neighbors.set(b, lb);
  }

  let order = [...initial];
  for (let round = 0; round < rounds; round++) {
    const index = new Map(order.map((t, i) => [t, i]));
    const scored = order.map((track) => {
      const nbrs = neighbors.get(track) ?? [];
      if (nbrs.length === 0) return { track, key: index.get(track)! };
      const positions = nbrs
        .map((n) => index.get(n))
        .filter((v): v is number => v !== undefined)
        .sort((a, b) => a - b);
      const mid = positions[Math.floor(positions.length / 2)] ?? index.get(track)!;
      return { track, key: mid };
    });
    scored.sort((a, b) => a.key - b.key || index.get(a.track)! - index.get(b.track)!);
    order = scored.map((s) => s.track);
  }

  return order;
}

const baselineLanes = { ...TRACK_EXCLUSIVE_LANES };
const baseline = countCrossings(TRACK_ROW_ORDER, baselineLanes);
console.log("baseline", baseline);

const bary = barycenterOrder(TRACK_ROW_ORDER, baselineLanes, 8);
const baryScore = countCrossings(bary, baselineLanes);
console.log("barycenter", baryScore.crossings, bary.join(","));

const seeds = [1, 2, 3, 7, 11, 42, 99, 123, 404, 777];
let bestBlocks = { order: [...TRACK_ROW_ORDER] as McuTrack[], crossings: baseline.crossings };
let bestFree = { order: [...TRACK_ROW_ORDER] as McuTrack[], crossings: baseline.crossings };

for (const seed of seeds) {
  const start = seed % 2 === 0 ? [...TRACK_ROW_ORDER] : [...bary];
  shuffleInPlace(start, makeRng(seed * 17));
  // half start from baseline/bary without full shuffle
  const init =
    seed % 3 === 0
      ? [...TRACK_ROW_ORDER]
      : seed % 3 === 1
        ? [...bary]
        : start;

  const withBlocks = annealTracks(init, baselineLanes, {
    seed: seed * 101,
    iterations: 2500,
    keepBlocks: true,
    label: `blocks#${seed}`,
  });
  if (withBlocks.crossings < bestBlocks.crossings) bestBlocks = withBlocks;

  const free = annealTracks(init, baselineLanes, {
    seed: seed * 203,
    iterations: 2500,
    keepBlocks: false,
    label: `free#${seed}`,
  });
  if (free.crossings < bestFree.crossings) bestFree = free;
}

console.log("\nBEST blocks", bestBlocks.crossings);
console.log(bestBlocks.order.join(","));
console.log("\nBEST free", bestFree.crossings);
console.log(bestFree.order.join(","));

const chosen = bestBlocks.crossings <= bestFree.crossings + 8
  ? bestBlocks
  : bestFree;
console.log("\nchosen for street refine", chosen.crossings);

const streetOpt = annealStreetLanes(
  chosen.order,
  baselineLanes,
  55,
  2000,
);

// also try flipping young-heroes
const yh = [...(baselineLanes["young-heroes"] ?? [])].reverse();
const yhLanes = {
  ...baselineLanes,
  street: streetOpt.street,
  "young-heroes": yh,
};
const yhScore = countCrossings(chosen.order, yhLanes);
console.log("young-heroes flipped", yhScore.crossings);

const finalLanes =
  yhScore.crossings < streetOpt.crossings
    ? yhLanes
    : { ...baselineLanes, street: streetOpt.street };
const finalScore = countCrossings(chosen.order, finalLanes);

console.log("\n=== FINAL ===");
console.log({
  crossings: finalScore.crossings,
  delta: finalScore.crossings - baseline.crossings,
});
console.log("TRACK_ROW_ORDER:");
console.log(JSON.stringify(chosen.order, null, 2));
console.log("street lanes:");
console.log(JSON.stringify(finalLanes.street, null, 2));
console.log("young-heroes:");
console.log(JSON.stringify(finalLanes["young-heroes"], null, 2));
