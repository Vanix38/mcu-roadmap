import type { McuItem } from "./mcu";
import {
  GRID_COL_WIDTH,
  GRID_OVERFLOW_ROW,
  GRID_PADDING_X,
  GRID_PADDING_Y,
  GRID_ROW_HEIGHT,
  gridX,
  gridY,
  orderToGridCol,
} from "./grid-layout";
import { getGridPositions, LAYOUT_REVISION } from "./layout-solver";
import { getNodeDimensions } from "./node-dimensions";
import {
  routeEdges,
  type DependencyEdge,
  type RoutedEdge,
} from "./edge-routing";

export type { RoutedEdge } from "./edge-routing";
export { edgeId, pathMidpoint, scaleRoutedEdgePath } from "./edge-routing";

export { getNodeDimensions } from "./node-dimensions";

export type PositionedNode = {
  item: McuItem;
  layer: number;
  x: number;
  y: number;
  column: number;
};

export type DependencyLayout = {
  nodes: PositionedNode[];
  edges: RoutedEdge[];
  width: number;
  height: number;
};

const OVERFLOW_STAGGER = 72;

export function canCheckItem(item: McuItem, checked: Set<string>) {
  return item.dependsOn.every((dependencyId) => checked.has(dependencyId));
}

export function getAncestorIds(items: readonly McuItem[], id: string) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ancestors = new Set<string>();
  const queue = [id];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const item = byId.get(current);
    if (!item) continue;

    for (const dependencyId of item.dependsOn) {
      if (!ancestors.has(dependencyId)) {
        ancestors.add(dependencyId);
        queue.push(dependencyId);
      }
    }
  }

  ancestors.delete(id);
  return ancestors;
}

export function getHighlightIds(
  items: readonly McuItem[],
  hoveredId: string | null,
) {
  if (!hoveredId) return null;

  const related = new Set<string>([hoveredId]);
  for (const id of getAncestorIds(items, hoveredId)) related.add(id);
  for (const id of getDescendantIds(items, hoveredId)) related.add(id);

  return related;
}

export function getDescendantIds(items: readonly McuItem[], id: string) {
  const descendants = new Set<string>();
  const queue = [id];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;

    for (const item of items) {
      if (item.dependsOn.includes(current) && !descendants.has(item.id)) {
        descendants.add(item.id);
        queue.push(item.id);
      }
    }
  }

  return descendants;
}

function computeLayers(items: readonly McuItem[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const layers = new Map<string, number>();

  function layerFor(id: string, stack: Set<string> = new Set()): number {
    const cached = layers.get(id);
    if (cached !== undefined) return cached;
    if (stack.has(id)) return 0;

    const item = byId.get(id);
    if (!item || item.dependsOn.length === 0) {
      layers.set(id, 0);
      return 0;
    }

    stack.add(id);
    const nextLayer =
      Math.max(...item.dependsOn.map((dependencyId) => layerFor(dependencyId, stack))) + 1;
    stack.delete(id);
    layers.set(id, nextLayer);
    return nextLayer;
  }

  for (const item of items) {
    layerFor(item.id);
  }

  return layers;
}

function resolveRowCollision(
  x: number,
  y: number,
  item: McuItem,
  positioned: Map<string, PositionedNode>,
) {
  const { width, height } = getNodeDimensions(item);
  let resolvedX = x;
  let attempts = 0;

  while (attempts < 10) {
    const collision = [...positioned.values()].some((node) => {
      if (node.item.id === item.id) return false;
      const other = getNodeDimensions(node.item);
      const dx = Math.abs(node.x - resolvedX);
      const dy = Math.abs(node.y - y);
      return (
        dx < Math.max(width, other.width) * 0.72 &&
        dy < Math.max(height, other.height) * 0.9
      );
    });

    if (!collision) break;
    resolvedX += OVERFLOW_STAGGER * 0.65;
    attempts += 1;
  }

  return resolvedX;
}

export { LAYOUT_REVISION } from "./layout-solver";

export function buildDependencyLayout(items: readonly McuItem[]): DependencyLayout {
  const layers = computeLayers(items);
  const byId = new Map(items.map((item) => [item.id, item]));
  const gridPositions = getGridPositions(items);
  const positioned = new Map<string, PositionedNode>();
  const overflowColSlots = new Map<number, number>();

  for (const item of items) {
    const grid = gridPositions[item.id];
    if (!grid) continue;

    positioned.set(item.id, {
      item,
      layer: layers.get(item.id) ?? 0,
      x: gridX(grid.col),
      y: gridY(grid.row),
      column: grid.col,
    });
  }

  const overflow = [...items]
    .filter((item) => !gridPositions[item.id])
    .sort((a, b) => a.order - b.order);

  for (const item of overflow) {
    const col = orderToGridCol(item.order);
    const slot = overflowColSlots.get(col) ?? 0;
    overflowColSlots.set(col, slot + 1);

    const y = gridY(GRID_OVERFLOW_ROW);
    let x = gridX(col) + slot * OVERFLOW_STAGGER;
    x = resolveRowCollision(x, y, item, positioned);

    positioned.set(item.id, {
      item,
      layer: layers.get(item.id) ?? 0,
      x,
      y,
      column: col,
    });
  }

  const rawEdges: DependencyEdge[] = [];
  for (const item of items) {
    for (const dependencyId of item.dependsOn) {
      if (byId.has(dependencyId)) {
        rawEdges.push({ from: dependencyId, to: item.id });
      }
    }
  }

  const nodeById = new Map(
    [...positioned.values()].map((node) => [node.item.id, node]),
  );
  const edges = routeEdges(rawEdges, nodeById);

  const nodes = items
    .map((item) => positioned.get(item.id))
    .filter((node): node is PositionedNode => Boolean(node));

  const maxCol = Math.max(
    ...nodes.map((node) => node.column),
    ...Object.values(gridPositions).map((p) => p.col),
  );
  const maxRow = Math.max(
    ...Object.values(gridPositions).map((p) => p.row),
    GRID_OVERFLOW_ROW,
  );

  return {
    nodes,
    edges,
    width: GRID_PADDING_X + (maxCol + 2) * GRID_COL_WIDTH,
    height: GRID_PADDING_Y + (maxRow + 2) * GRID_ROW_HEIGHT,
  };
}

export function computeProgress(items: readonly McuItem[], checked: Set<string>) {
  const total = items.length;
  const done = items.reduce((acc, item) => acc + (checked.has(item.id) ? 1 : 0), 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

/** Arête orthogonale LTR entre deux nœuds */
export function edgePathBetween(
  fromX: number,
  fromY: number,
  fromWidth: number,
  toX: number,
  toY: number,
  toWidth: number,
) {
  const startX = fromX + fromWidth / 2;
  const startY = fromY;
  const endX = toX - toWidth / 2;
  const endY = toY;

  if (Math.abs(startY - endY) < 8) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const routeX = startX + (endX - startX) * 0.55;
  return `M ${startX} ${startY} L ${routeX} ${startY} L ${routeX} ${endY} L ${endX} ${endY}`;
}
