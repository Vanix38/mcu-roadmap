/**
 * Affine l'ordre par blocs narratifs + sous-lignes street.
 * Usage: npx tsx scripts/optimize-track-order-blocks.ts
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
  return crossings;
}

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

/** Blocs assouplis : TV regroupable, Spider MCU collé Sony, Carter avec SHIELD */
const BLOCK_SETS: readonly (readonly (readonly McuTrack[])[])[] = [
  // A — actuel élargi
  [
    ["iron", "hulk", "thor", "cap", "falcon", "guardians", "antman"],
    ["agent-carter", "shield"],
    ["animation", "wakanda", "series-misc"],
    ["merge"],
    ["cosmic", "mystic", "magic", "misc"],
    ["spidey", "raimi", "amazing", "loki", "venom", "spider-misc", "spiderverse"],
    ["deadpool", "wolverine", "xmen", "fantastic"],
    ["street", "young-heroes"],
  ],
  // B — héros classiques + branches avant merge, Sony/Fox séparés, street bas
  [
    ["iron", "hulk", "thor", "cap", "falcon", "agent-carter", "guardians", "antman"],
    ["animation", "wakanda", "series-misc"],
    ["merge"],
    ["cosmic", "mystic", "magic", "misc"],
    ["spidey", "shield"],
    ["raimi", "amazing", "loki", "venom", "spider-misc", "spiderverse"],
    ["deadpool", "wolverine", "xmen", "fantastic"],
    ["street", "young-heroes"],
  ],
  // C — street près de shield (TV), Fox puis Sony
  [
    ["iron", "hulk", "thor", "cap", "falcon", "guardians", "antman"],
    ["animation", "wakanda", "series-misc"],
    ["merge"],
    ["cosmic", "mystic", "magic", "misc", "spidey"],
    ["agent-carter", "shield", "street", "young-heroes"],
    ["raimi", "amazing", "loki", "venom", "spider-misc", "spiderverse"],
    ["deadpool", "wolverine", "xmen", "fantastic"],
  ],
  // D — Fox haut (chronologie), MCU milieu, Sony/street bas
  [
    ["deadpool", "wolverine", "xmen", "fantastic"],
    ["raimi", "amazing", "venom", "spider-misc", "spiderverse"],
    ["iron", "hulk", "thor", "cap", "falcon", "agent-carter", "guardians", "antman"],
    ["animation", "wakanda", "series-misc", "shield"],
    ["merge"],
    ["cosmic", "mystic", "magic", "misc", "spidey", "loki"],
    ["street", "young-heroes"],
  ],
];

function orderToBlocks(
  order: readonly McuTrack[],
  softBlocks: readonly (readonly McuTrack[])[],
): McuTrack[][] {
  const remaining = new Set(order);
  const blocks: McuTrack[][] = [];
  for (const block of softBlocks) {
    const present = block.filter((t) => remaining.has(t));
    if (present.length === 0) continue;
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

function flatten(blocks: readonly (readonly McuTrack[])[]) {
  return blocks.flatMap((b) => [...b]);
}

function anneal(
  initial: readonly McuTrack[],
  softBlocks: readonly (readonly McuTrack[])[],
  lanes: Partial<Record<McuTrack, readonly string[]>>,
  seed: number,
  iterations: number,
) {
  const rand = makeRng(seed);
  let current = [...initial];
  let currentScore = countCrossings(current, lanes);
  let best = current;
  let bestScore = currentScore;
  const t0 = 10;
  const t1 = 0.04;

  for (let i = 0; i < iterations; i++) {
    const t = t0 * Math.pow(t1 / t0, i / iterations);
    const blocks = orderToBlocks(current, softBlocks);
    const r = rand();
    let next: McuTrack[];

    if (r < 0.4 && blocks.length >= 2) {
      const a = Math.floor(rand() * blocks.length);
      let b = Math.floor(rand() * blocks.length);
      if (b === a) b = (b + 1) % blocks.length;
      next = flatten(rand() < 0.5 ? swap(blocks, a, b) : moveIndex(blocks, a, b));
    } else {
      const bi = Math.floor(rand() * blocks.length);
      const block = blocks[bi];
      if (block.length < 2) {
        const a = Math.floor(rand() * blocks.length);
        let b = Math.floor(rand() * blocks.length);
        if (b === a) b = (b + 1) % blocks.length;
        next = flatten(swap(blocks, a, b));
      } else {
        const a = Math.floor(rand() * block.length);
        let b = Math.floor(rand() * block.length);
        if (b === a) b = (b + 1) % block.length;
        const nb = [...blocks];
        nb[bi] =
          rand() < 0.6 ? swap(block, a, b) : moveIndex(block, a, b);
        next = flatten(nb);
      }
    }

    const score = countCrossings(next, lanes);
    if (score <= currentScore || rand() < Math.exp((currentScore - score) / t)) {
      current = next;
      currentScore = score;
      if (score < bestScore) {
        best = next;
        bestScore = score;
      }
    }
  }

  return { order: best, crossings: bestScore };
}

function annealStreet(
  trackOrder: readonly McuTrack[],
  baseLanes: Partial<Record<McuTrack, readonly string[]>>,
  seed: number,
  iterations: number,
) {
  const rand = makeRng(seed);
  let current = [...(baseLanes.street ?? TRACK_EXCLUSIVE_LANES.street!)];
  let currentScore = countCrossings(trackOrder, {
    ...baseLanes,
    street: current,
  });
  let best = current;
  let bestScore = currentScore;
  const t0 = 6;
  const t1 = 0.05;

  for (let i = 0; i < iterations; i++) {
    const t = t0 * Math.pow(t1 / t0, i / iterations);
    const a = Math.floor(rand() * current.length);
    let b = Math.floor(rand() * current.length);
    if (b === a) b = (b + 1) % current.length;
    const next =
      rand() < 0.65 ? swap(current, a, b) : moveIndex(current, a, b);
    const score = countCrossings(trackOrder, {
      ...baseLanes,
      street: next,
    });
    if (score <= currentScore || rand() < Math.exp((currentScore - score) / t)) {
      current = next;
      currentScore = score;
      if (score < bestScore) {
        best = next;
        bestScore = score;
      }
    }
  }
  return { street: best, crossings: bestScore };
}

const lanes = { ...TRACK_EXCLUSIVE_LANES };
const baseline = countCrossings(TRACK_ROW_ORDER, lanes);
console.log("baseline", baseline);

// seed from previous best blocks
const prevBest: McuTrack[] = [
  "guardians",
  "agent-carter",
  "iron",
  "falcon",
  "antman",
  "cap",
  "hulk",
  "thor",
  "animation",
  "wakanda",
  "series-misc",
  "merge",
  "cosmic",
  "mystic",
  "misc",
  "magic",
  "spidey",
  "shield",
  "venom",
  "spiderverse",
  "amazing",
  "loki",
  "spider-misc",
  "raimi",
  "fantastic",
  "deadpool",
  "wolverine",
  "xmen",
  "street",
  "young-heroes",
];

let globalBest = {
  order: [...TRACK_ROW_ORDER] as McuTrack[],
  crossings: baseline,
  set: -1,
};

for (let si = 0; si < BLOCK_SETS.length; si++) {
  const soft = BLOCK_SETS[si];
  const inits: McuTrack[][] = [
    [...TRACK_ROW_ORDER],
    [...prevBest],
    flatten(soft.map((b) => [...b])),
  ];

  for (let seed = 0; seed < 6; seed++) {
    const init = inits[seed % inits.length];
    const result = anneal(init, soft, lanes, 1000 + si * 100 + seed, 4000);
    console.log(`set${si} seed${seed}: ${result.crossings}`);
    if (result.crossings < globalBest.crossings) {
      globalBest = { ...result, set: si };
    }
  }
}

console.log("\nbest tracks", globalBest.crossings, "set", globalBest.set);
console.log(globalBest.order.join(","));

const street = annealStreet(globalBest.order, lanes, 99, 3000);
console.log("street", street.crossings);
console.log(street.street.join(","));

const finalLanes = { ...lanes, street: street.street };
const yhFlip = {
  ...finalLanes,
  "young-heroes": [...(finalLanes["young-heroes"] ?? [])].reverse(),
};
const yhScore = countCrossings(globalBest.order, yhFlip);
console.log("yh flip", yhScore);

const useLanes = yhScore < street.crossings ? yhFlip : finalLanes;
const final = countCrossings(globalBest.order, useLanes);

console.log("\n=== FINAL ===", final, "delta", final - baseline);
console.log(JSON.stringify({ order: globalBest.order, street: useLanes.street, yh: useLanes["young-heroes"] }, null, 2));
