import type { DependencyLayout } from "./dependencies";
import type { EdgeSegment } from "./edge-routing";
import { GRID_ROW_HEIGHT } from "./grid-layout";

/** Poids d'un croisement selon la nature des deux arêtes */
export const CROSSING_WEIGHTS = {
  required: 10,
  mixed: 2,
  optional: 1,
} as const;

/** Pénalité par rangée de trait vertical (lisibilité des liens longs) */
export const SPAN_WEIGHTS = {
  required: 0.4,
  optional: 0.1,
} as const;

export type CrossingStats = {
  required: number;
  mixed: number;
  optional: number;
  /** Rangées verticales cumulées des liens nécessaires */
  requiredSpan: number;
  /** Rangées verticales cumulées des liens optionnels */
  optionalSpan: number;
  cost: number;
};

function intersects(h: EdgeSegment, v: EdgeSegment) {
  if (h.kind !== "h" || v.kind !== "v") return false;
  const hMin = Math.min(h.x1, h.x2);
  const hMax = Math.max(h.x1, h.x2);
  const vMin = Math.min(v.y1, v.y2);
  const vMax = Math.max(v.y1, v.y2);
  return (
    v.x1 > hMin + 1 && v.x1 < hMax - 1 && h.y1 > vMin + 1 && h.y1 < vMax - 1
  );
}

function countSegmentCrossings(a: EdgeSegment[], b: EdgeSegment[]) {
  let count = 0;
  for (const segA of a) {
    for (const segB of b) {
      if (segA.kind === "h" ? intersects(segA, segB) : intersects(segB, segA)) {
        count += 1;
      }
    }
  }
  return count;
}

function verticalRows(segments: EdgeSegment[]) {
  let length = 0;
  for (const segment of segments) {
    if (segment.kind === "v") length += Math.abs(segment.y2 - segment.y1);
  }
  return length / GRID_ROW_HEIGHT;
}

/**
 * Mesure un layout routé : croisements par nature d'arête + longueur verticale.
 * Une arête est « optionnelle » si le lien est soft ou si l'une de ses
 * extrémités est un contenu optionnel.
 */
export function measureCrossings(layout: DependencyLayout): CrossingStats {
  const optionalNodes = new Set(
    layout.nodes.filter((node) => node.item.optional).map((node) => node.item.id),
  );
  const edges = layout.edges.map((edge) => ({
    segments: edge.segments,
    isOptional:
      edge.optional || optionalNodes.has(edge.from) || optionalNodes.has(edge.to),
  }));

  const stats: CrossingStats = {
    required: 0,
    mixed: 0,
    optional: 0,
    requiredSpan: 0,
    optionalSpan: 0,
    cost: 0,
  };

  for (let i = 0; i < edges.length; i += 1) {
    const rows = verticalRows(edges[i].segments);
    if (edges[i].isOptional) stats.optionalSpan += rows;
    else stats.requiredSpan += rows;

    for (let j = i + 1; j < edges.length; j += 1) {
      const hits = countSegmentCrossings(edges[i].segments, edges[j].segments);
      if (hits === 0) continue;
      const optionalCount = Number(edges[i].isOptional) + Number(edges[j].isOptional);
      if (optionalCount === 0) stats.required += hits;
      else if (optionalCount === 1) stats.mixed += hits;
      else stats.optional += hits;
    }
  }

  stats.cost =
    stats.required * CROSSING_WEIGHTS.required +
    stats.mixed * CROSSING_WEIGHTS.mixed +
    stats.optional * CROSSING_WEIGHTS.optional +
    stats.requiredSpan * SPAN_WEIGHTS.required +
    stats.optionalSpan * SPAN_WEIGHTS.optional;
  return stats;
}
