import type { McuItem, McuTrack } from "./mcu";
import { GRID_COL_WIDTH, GRID_ROW_HEIGHT } from "./grid-layout";
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
/** Sous ce gap horizontal, les nœuds sont dans la même colonne */
const SAME_COLUMN_MIN_GAP = 40;
/** Décalage du couloir vertical pour les arêtes même colonne */
const SAME_COLUMN_DETOUR = 22;
/** Marge hors bbox affiche pour les couloirs */
const NODE_CLEARANCE = 6;
/** Tolérance « même rangée » */
const SAME_ROW_EPS = 8;

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

type RouteStyle = "hvh" | "channel" | "direct" | "same-col";

type EdgeDraft = {
  edge: DependencyEdge;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Couloir vertical principal (HVH / same-col) ou sortie (channel) */
  baseRouteX: number;
  /** Couloir vertical d'entrée côté cible (channel) */
  baseInX: number;
  /** Couloir horizontal entre pistes (channel) */
  channelY: number;
  style: RouteStyle;
  toLayer: number;
  toOrder: number;
  track: McuTrack;
};

type NodeRect = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function edgeId(edge: DependencyEdge) {
  return `${edge.from}->${edge.to}`;
}

function nodeRect(node: PositionedNodeInput): NodeRect {
  const { width, height } = getNodeDimensions(node.item);
  const pad = NODE_CLEARANCE;
  return {
    id: node.item.id,
    left: node.x - width / 2 - pad,
    right: node.x + width / 2 + pad,
    top: node.y - height / 2 - pad,
    bottom: node.y + height / 2 + pad,
  };
}

function hHitsRect(y: number, x1: number, x2: number, r: NodeRect): boolean {
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  if (y <= r.top || y >= r.bottom) return false;
  return hi > r.left + 1 && lo < r.right - 1;
}

function vHitsRect(x: number, y1: number, y2: number, r: NodeRect): boolean {
  const lo = Math.min(y1, y2);
  const hi = Math.max(y1, y2);
  if (x <= r.left || x >= r.right) return false;
  return hi > r.top + 1 && lo < r.bottom - 1;
}

function segmentsHitNodes(
  segments: EdgeSegment[],
  rects: NodeRect[],
  excludeIds: ReadonlySet<string>,
): boolean {
  for (const segment of segments) {
    for (const rect of rects) {
      if (excludeIds.has(rect.id)) continue;
      const hit =
        segment.kind === "h"
          ? hHitsRect(segment.y1, segment.x1, segment.x2, rect)
          : vHitsRect(segment.x1, segment.y1, segment.y2, rect);
      if (hit) return true;
    }
  }
  return false;
}

/** Couloir vertical à droite du centre de colonne */
function gutterAfter(centerX: number) {
  return centerX + GRID_COL_WIDTH / 2;
}

/** Couloir vertical à gauche du centre de colonne */
function gutterBefore(centerX: number) {
  return centerX - GRID_COL_WIDTH / 2;
}

/** Premier couloir horizontal vers la cible (entre deux rangées) */
function rowChannelToward(startY: number, endY: number) {
  if (Math.abs(endY - startY) < SAME_ROW_EPS) {
    return startY + GRID_ROW_HEIGHT / 2;
  }
  const dir = endY > startY ? 1 : -1;
  return startY + dir * (GRID_ROW_HEIGHT / 2);
}

function corridorKey(draft: EdgeDraft) {
  const minY = Math.min(draft.startY, draft.endY, draft.channelY);
  const maxY = Math.max(draft.startY, draft.endY, draft.channelY);
  return `${draft.style}:${Math.round(draft.baseRouteX / 40)}:${Math.round(minY / 100)}-${Math.round(maxY / 100)}`;
}

function buildHvhSegments(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  routeX: number,
): EdgeSegment[] {
  if (Math.abs(startY - endY) < SAME_ROW_EPS) {
    return [{ kind: "h", x1: startX, y1: startY, x2: endX, y2: endY }];
  }

  return [
    { kind: "h", x1: startX, y1: startY, x2: routeX, y2: startY },
    { kind: "v", x1: routeX, y1: startY, x2: routeX, y2: endY },
    { kind: "h", x1: routeX, y1: endY, x2: endX, y2: endY },
  ];
}

/** Contourne les affiches via couloir de rangée + 2 couloirs de colonne */
function buildChannelSegments(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  outX: number,
  inX: number,
  channelY: number,
): EdgeSegment[] {
  const segments: EdgeSegment[] = [];

  if (Math.abs(outX - startX) > 1) {
    segments.push({ kind: "h", x1: startX, y1: startY, x2: outX, y2: startY });
  }
  if (Math.abs(channelY - startY) > 1) {
    segments.push({ kind: "v", x1: outX, y1: startY, x2: outX, y2: channelY });
  }
  if (Math.abs(inX - outX) > 1) {
    segments.push({ kind: "h", x1: outX, y1: channelY, x2: inX, y2: channelY });
  }
  if (Math.abs(endY - channelY) > 1) {
    segments.push({ kind: "v", x1: inX, y1: channelY, x2: inX, y2: endY });
  }
  if (Math.abs(endX - inX) > 1) {
    segments.push({ kind: "h", x1: inX, y1: endY, x2: endX, y2: endY });
  }

  return segments;
}

function buildDraftSegments(draft: EdgeDraft, lane: number): EdgeSegment[] {
  if (draft.style === "direct") {
    return [
      {
        kind: "h",
        x1: draft.startX,
        y1: draft.startY,
        x2: draft.endX,
        y2: draft.endY,
      },
    ];
  }

  if (draft.style === "channel") {
    const outX = draft.baseRouteX + lane * LANE_SPACING;
    const inX = draft.baseInX + lane * LANE_SPACING;
    const channelY = draft.channelY + lane * LANE_SPACING;
    return buildChannelSegments(
      draft.startX,
      draft.startY,
      draft.endX,
      draft.endY,
      outX,
      inX,
      channelY,
    );
  }

  const routeX = draft.baseRouteX + lane * LANE_SPACING;
  return buildHvhSegments(
    draft.startX,
    draft.startY,
    draft.endX,
    draft.endY,
    routeX,
  );
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
          parts.push(
            `A ${BRIDGE_RADIUS} ${BRIDGE_RADIUS} 0 0 1 ${x} ${cy + BRIDGE_RADIUS}`,
          );
        } else {
          parts.push(`L ${x} ${cy + BRIDGE_RADIUS}`);
          parts.push(
            `A ${BRIDGE_RADIUS} ${BRIDGE_RADIUS} 0 0 0 ${x} ${cy - BRIDGE_RADIUS}`,
          );
        }
      }
      parts.push(`L ${segment.x2} ${segment.y2}`);
    } else {
      parts.push(`L ${segment.x2} ${segment.y2}`);
    }
  }

  return parts.join(" ");
}

function segmentIntersection(
  h: EdgeSegment,
  v: EdgeSegment,
): { x: number; y: number } | null {
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
    if (draft.style !== "hvh" && draft.style !== "channel") continue;
    const bucket = byTarget.get(draft.edge.to) ?? [];
    bucket.push(draft);
    byTarget.set(draft.edge.to, bucket);
  }

  const convergedTargets = new Set<string>();

  for (const [targetId, bucket] of byTarget.entries()) {
    if (bucket.length < 2) continue;

    // Fusionner sur le couloir d'entrée côté cible
    const sharedInX = Math.max(
      ...bucket.map((draft) =>
        draft.style === "channel" ? draft.baseInX : draft.baseRouteX,
      ),
    );
    for (const draft of bucket) {
      if (draft.style === "channel") {
        draft.baseInX = sharedInX;
      } else {
        draft.baseRouteX = sharedInX;
      }
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

  // Les traits restent sous les affiches ; « over » ne sert qu'aux ponts entre arêtes
  for (const edge of routed) {
    edge.zLayer = "under";
  }

  const withCrossings = routed.filter((e) => e.crossings.length > 0);
  if (withCrossings.length === 0) return;

  const sorted = [...withCrossings].sort((a, b) => {
    if (a.toLayer !== b.toLayer) return a.toLayer - b.toLayer;
    return a.toOrder - b.toOrder;
  });

  for (let i = Math.floor(sorted.length / 2); i < sorted.length; i++) {
    sorted[i].zLayer = "over";
  }
}

function planDraft(
  edge: DependencyEdge,
  from: PositionedNodeInput,
  to: PositionedNodeInput,
  rects: NodeRect[],
): EdgeDraft {
  const fromSize = getNodeDimensions(from.item);
  const toSize = getNodeDimensions(to.item);

  let startX = from.x + fromSize.width / 2;
  const startY = from.y;
  let endX = to.x - toSize.width / 2;
  const endY = to.y;

  const exclude = new Set([from.item.id, to.item.id]);
  const sameRow = Math.abs(startY - endY) < SAME_ROW_EPS;
  const horizontalGap = endX - startX;

  const base: Omit<EdgeDraft, "baseRouteX" | "baseInX" | "channelY" | "style"> =
    {
      edge,
      startX,
      startY,
      endX,
      endY,
      toLayer: to.layer,
      toOrder: to.item.order,
      track: to.item.track,
    };

  // Même colonne : sortir et entrer par la gauche
  if (horizontalGap < SAME_COLUMN_MIN_GAP) {
    startX = from.x - fromSize.width / 2;
    endX = to.x - toSize.width / 2;
    const routeX = Math.min(startX, endX) - SAME_COLUMN_DETOUR;
    return {
      ...base,
      startX,
      endX,
      baseRouteX: routeX,
      baseInX: routeX,
      channelY: startY,
      style: "same-col",
    };
  }

  const outX = gutterAfter(from.x);
  const inX = gutterBefore(to.x);
  const preferredHvhX =
    sameRow || outX >= inX - 1
      ? outX
      : Math.min(Math.max(startX + (endX - startX) * 0.55, outX), inX);

  // HVH court (colonnes voisines ou couloir unique) si aucun chevauchement d'affiche
  if (outX >= inX - 1 || Math.abs(outX - inX) < GRID_COL_WIDTH * 0.75) {
    const routeX = outX <= inX ? outX : preferredHvhX;
    const hvh = buildHvhSegments(startX, startY, endX, endY, routeX);
    if (!segmentsHitNodes(hvh, rects, exclude)) {
      return {
        ...base,
        baseRouteX: routeX,
        baseInX: routeX,
        channelY: startY,
        style: sameRow ? "direct" : "hvh",
      };
    }
  } else {
    const hvh = buildHvhSegments(startX, startY, endX, endY, preferredHvhX);
    if (!segmentsHitNodes(hvh, rects, exclude)) {
      return {
        ...base,
        baseRouteX: preferredHvhX,
        baseInX: preferredHvhX,
        channelY: startY,
        style: "hvh",
      };
    }
  }

  // Même rangée, courte : trait direct si le gap est libre (interstice uniquement)
  if (sameRow) {
    const direct = buildHvhSegments(startX, startY, endX, endY, startX);
    if (!segmentsHitNodes(direct, rects, exclude)) {
      return {
        ...base,
        baseRouteX: startX,
        baseInX: endX,
        channelY: startY,
        style: "direct",
      };
    }
  }

  // Contournement : couloirs entre colonnes + entre pistes
  const channelY = rowChannelToward(startY, endY);
  let channelOutX = outX;
  let channelInX = inX;

  // Si la cible est à gauche (rare), inverser les couloirs
  if (channelInX < channelOutX - 1 && endX < startX) {
    channelOutX = gutterBefore(from.x);
    channelInX = gutterAfter(to.x);
  }

  // Si out/in confondus (colonne suivante), un seul couloir vertical + canal
  if (channelInX < channelOutX) {
    channelInX = channelOutX;
  }

  return {
    ...base,
    baseRouteX: channelOutX,
    baseInX: channelInX,
    channelY,
    style: "channel",
  };
}

export function routeEdges(
  rawEdges: DependencyEdge[],
  nodeById: Map<string, PositionedNodeInput>,
): RoutedEdge[] {
  const rects = [...nodeById.values()].map(nodeRect);
  const drafts: EdgeDraft[] = [];

  for (const edge of rawEdges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    drafts.push(planDraft(edge, from, to, rects));
  }

  const convergedTargets = convergeTargetEdges(drafts);
  const laneMap = assignLanes(drafts, convergedTargets);

  const routed: RoutedEdge[] = drafts.map((draft) => {
    const lane = laneMap.get(edgeId(draft.edge)) ?? 0;
    const segments = buildDraftSegments(draft, lane);

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

/** Compte les segments qui traversent une affiche (hors extrémités) — debug / validate */
export function countPosterOverlaps(
  edges: RoutedEdge[],
  nodeById: Map<string, PositionedNodeInput>,
): number {
  const rects = [...nodeById.values()].map(nodeRect);
  let hits = 0;

  for (const edge of edges) {
    const exclude = new Set([edge.from, edge.to]);
    if (segmentsHitNodes(edge.segments, rects, exclude)) hits += 1;
  }

  return hits;
}
