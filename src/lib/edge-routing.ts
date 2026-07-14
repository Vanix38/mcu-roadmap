import type { McuItem, McuTrack } from "./mcu";
import { getNodeDimensions } from "./node-dimensions";

export type DependencyEdge = {
  from: string;
  to: string;
};

export type PositionedNodeInput = {
  x: number;
  y: number;
  layer: number;
  item: McuItem;
};

export const LANE_SPACING = 14;
export const MAX_LANES_PER_CORRIDOR = 4;
const BRIDGE_RADIUS = 6;

export type EdgeSegment = {
  kind: "v" | "h";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type RoutedEdge = DependencyEdge & {
  id: string;
  lane: number;
  track: McuTrack;
  toLayer: number;
  toOrder: number;
  segments: EdgeSegment[];
  crossings: { x: number; y: number }[];
  zLayer: "under" | "over";
  pathD: string;
};

type EdgeDraft = {
  edge: DependencyEdge;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  baseRouteX: number;
  toLayer: number;
  toOrder: number;
  track: McuTrack;
};

export function edgeId(edge: DependencyEdge) {
  return `${edge.from}->${edge.to}`;
}

function corridorKey(draft: EdgeDraft) {
  const minY = Math.min(draft.startY, draft.endY);
  const maxY = Math.max(draft.startY, draft.endY);
  return `${Math.round(draft.baseRouteX / 40)}:${Math.round(minY / 100)}-${Math.round(maxY / 100)}`;
}

function buildSegments(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  routeX: number,
): EdgeSegment[] {
  if (Math.abs(startY - endY) < 8) {
    return [{ kind: "h", x1: startX, y1: startY, x2: endX, y2: endY }];
  }

  return [
    { kind: "h", x1: startX, y1: startY, x2: routeX, y2: startY },
    { kind: "v", x1: routeX, y1: startY, x2: routeX, y2: endY },
    { kind: "h", x1: routeX, y1: endY, x2: endX, y2: endY },
  ];
}

function buildPathFromSegments(
  segments: EdgeSegment[],
  crossings: { x: number; y: number }[],
  isUpper: boolean,
): string {
  if (segments.length === 0) return "";

  const parts: string[] = [];
  const first = segments[0];
  parts.push(`M ${first.x1} ${first.y1}`);

  for (const segment of segments) {
    if (segment.kind === "v" && isUpper && crossings.length > 0) {
      const x = segment.x1;
      const top = Math.min(segment.y1, segment.y2);
      const bottom = Math.max(segment.y1, segment.y2);
      const goingDown = segment.y2 >= segment.y1;
      const onSegment = crossings
        .filter((c) => Math.abs(c.x - x) < 1 && c.y > top && c.y < bottom)
        .sort((a, b) => (goingDown ? a.y - b.y : b.y - a.y));

      if (onSegment.length === 0) {
        parts.push(`L ${segment.x2} ${segment.y2}`);
        continue;
      }

      for (const crossing of onSegment) {
        const cy = crossing.y;
        if (goingDown) {
          parts.push(`L ${x} ${cy - BRIDGE_RADIUS}`);
          parts.push(`A ${BRIDGE_RADIUS} ${BRIDGE_RADIUS} 0 0 1 ${x} ${cy + BRIDGE_RADIUS}`);
        } else {
          parts.push(`L ${x} ${cy + BRIDGE_RADIUS}`);
          parts.push(`A ${BRIDGE_RADIUS} ${BRIDGE_RADIUS} 0 0 0 ${x} ${cy - BRIDGE_RADIUS}`);
        }
      }
      parts.push(`L ${segment.x2} ${segment.y2}`);
    } else {
      parts.push(`L ${segment.x2} ${segment.y2}`);
    }
  }

  return parts.join(" ");
}

function segmentIntersection(h: EdgeSegment, v: EdgeSegment): { x: number; y: number } | null {
  if (h.kind !== "h" || v.kind !== "v") return null;

  const hy = h.y1;
  const vx = v.x1;
  const hMin = Math.min(h.x1, h.x2);
  const hMax = Math.max(h.x1, h.x2);
  const vMin = Math.min(v.y1, v.y2);
  const vMax = Math.max(v.y1, v.y2);

  if (vx > hMin + 1 && vx < hMax - 1 && hy > vMin + 1 && hy < vMax - 1) {
    return { x: vx, y: hy };
  }

  return null;
}

function convergeTargetEdges(drafts: EdgeDraft[]): Set<string> {
  const byTarget = new Map<string, EdgeDraft[]>();

  for (const draft of drafts) {
    const bucket = byTarget.get(draft.edge.to) ?? [];
    bucket.push(draft);
    byTarget.set(draft.edge.to, bucket);
  }

  const convergedTargets = new Set<string>();

  for (const [targetId, bucket] of byTarget.entries()) {
    if (bucket.length < 2) continue;

    const sharedRouteX = Math.max(...bucket.map((draft) => draft.baseRouteX));
    for (const draft of bucket) {
      draft.baseRouteX = sharedRouteX;
    }
    convergedTargets.add(targetId);
  }

  return convergedTargets;
}

function assignLanes(
  drafts: EdgeDraft[],
  convergedTargets: ReadonlySet<string>,
): Map<string, number> {
  const groups = new Map<string, EdgeDraft[]>();

  for (const draft of drafts) {
    const key = corridorKey(draft);
    const bucket = groups.get(key) ?? [];
    bucket.push(draft);
    groups.set(key, bucket);
  }

  const lanes = new Map<string, number>();

  for (const bucket of groups.values()) {
    bucket.sort((a, b) => a.toOrder - b.toOrder);
    bucket.forEach((draft, index) => {
      const lane = convergedTargets.has(draft.edge.to)
        ? 0
        : Math.min(index, MAX_LANES_PER_CORRIDOR - 1);
      lanes.set(edgeId(draft.edge), lane);
    });
  }

  return lanes;
}

function detectCrossings(routed: RoutedEdge[]): void {
  for (let i = 0; i < routed.length; i++) {
    for (let j = i + 1; j < routed.length; j++) {
      const a = routed[i];
      const b = routed[j];

      for (const segA of a.segments) {
        for (const segB of b.segments) {
          const hit =
            segA.kind === "h"
              ? segmentIntersection(segA, segB)
              : segB.kind === "h"
                ? segmentIntersection(segB, segA)
                : null;

          if (!hit) continue;

          const aUpper =
            a.toLayer > b.toLayer ||
            (a.toLayer === b.toLayer && a.toOrder > b.toOrder);

          if (aUpper) {
            a.crossings.push(hit);
          } else {
            b.crossings.push(hit);
          }
        }
      }
    }
  }
}

function assignZLayers(routed: RoutedEdge[]): void {
  if (routed.length === 0) return;

  const sorted = [...routed].sort((a, b) => {
    if (a.toLayer !== b.toLayer) return a.toLayer - b.toLayer;
    return a.toOrder - b.toOrder;
  });

  const split = Math.floor(sorted.length / 2);
  const overIds = new Set(sorted.slice(split).map((e) => e.id));

  for (const edge of routed) {
    edge.zLayer = overIds.has(edge.id) ? "over" : "under";
  }
}

export function routeEdges(
  rawEdges: DependencyEdge[],
  nodeById: Map<string, PositionedNodeInput>,
): RoutedEdge[] {
  const drafts: EdgeDraft[] = [];

  for (const edge of rawEdges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;

    const fromSize = getNodeDimensions(from.item);
    const toSize = getNodeDimensions(to.item);

    const startX = from.x + fromSize.width / 2;
    const startY = from.y;
    const endX = to.x - toSize.width / 2;
    const endY = to.y;
    const baseRouteX = startX + (endX - startX) * 0.55;

    drafts.push({
      edge,
      startX,
      startY,
      endX,
      endY,
      baseRouteX,
      toLayer: to.layer,
      toOrder: to.item.order,
      track: to.item.track,
    });
  }

  const convergedTargets = convergeTargetEdges(drafts);
  const laneMap = assignLanes(drafts, convergedTargets);

  const routed: RoutedEdge[] = drafts.map((draft) => {
    const lane = laneMap.get(edgeId(draft.edge)) ?? 0;
    const routeX = draft.baseRouteX + lane * LANE_SPACING;
    const segments = buildSegments(
      draft.startX,
      draft.startY,
      draft.endX,
      draft.endY,
      routeX,
    );

    return {
      ...draft.edge,
      id: edgeId(draft.edge),
      lane,
      track: draft.track,
      toLayer: draft.toLayer,
      toOrder: draft.toOrder,
      segments,
      crossings: [],
      zLayer: "under" as const,
      pathD: buildPathFromSegments(segments, [], false),
    };
  });

  detectCrossings(routed);
  assignZLayers(routed);

  for (const edge of routed) {
    edge.pathD = buildPathFromSegments(
      edge.segments,
      edge.crossings,
      edge.zLayer === "over",
    );
  }

  return routed;
}

export function scaleRoutedEdgePath(
  edge: RoutedEdge,
  sx: number,
  sy: number,
): string {
  const segments = edge.segments.map((s) => ({
    ...s,
    x1: s.x1 * sx,
    y1: s.y1 * sy,
    x2: s.x2 * sx,
    y2: s.y2 * sy,
  }));
  const crossings = edge.crossings.map((c) => ({
    x: c.x * sx,
    y: c.y * sy,
  }));
  return buildPathFromSegments(
    segments,
    crossings,
    edge.zLayer === "over",
  );
}

/** Point médian approximatif d'un path pour le tooltip */
export function pathMidpoint(pathD: string): { x: number; y: number } | null {
  const numbers = pathD.match(/[\d.-]+/g);
  if (!numbers || numbers.length < 4) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < numbers.length - 1; i += 2) {
    xs.push(Number(numbers[i]));
    ys.push(Number(numbers[i + 1]));
  }

  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return { x: xs[mid], y: ys[mid] };
}
