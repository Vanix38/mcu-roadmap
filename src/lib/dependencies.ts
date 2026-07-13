import type { McuItem } from "./mcu";
import {
  GRID_COL_WIDTH,
  GRID_OVERFLOW_COL,
  GRID_PADDING_X,
  GRID_PADDING_Y,
  GRID_ROW_HEIGHT,
  MCU_GRID_POSITIONS,
  gridX,
  gridY,
  orderToGridRow,
} from "./grid-layout";
import { getNodeDimensions } from "./node-dimensions";

export { getNodeDimensions } from "./node-dimensions";

export type PositionedNode = {
  item: McuItem;
  layer: number;
  x: number;
  y: number;
  column: number;
};

export type DependencyEdge = {
  from: string;
  to: string;
};

export type DependencyLayout = {
  nodes: PositionedNode[];
  edges: DependencyEdge[];
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

function resolveColumnCollision(
  x: number,
  y: number,
  item: McuItem,
  positioned: Map<string, PositionedNode>,
) {
  const { width, height } = getNodeDimensions(item);
  let resolvedY = y;
  let attempts = 0;

  while (attempts < 10) {
    const collision = [...positioned.values()].some((node) => {
      if (node.item.id === item.id) return false;
      const other = getNodeDimensions(node.item);
      const dx = Math.abs(node.x - x);
      const dy = Math.abs(node.y - resolvedY);
      return (
        dx < Math.max(width, other.width) * 0.72 &&
        dy < Math.max(height, other.height) * 0.9
      );
    });

    if (!collision) break;
    resolvedY += OVERFLOW_STAGGER * 0.65;
    attempts += 1;
  }

  return resolvedY;
}

export function buildDependencyLayout(items: readonly McuItem[]): DependencyLayout {
  const layers = computeLayers(items);
  const byId = new Map(items.map((item) => [item.id, item]));
  const positioned = new Map<string, PositionedNode>();
  const overflowRowSlots = new Map<number, number>();

  for (const item of items) {
    const grid = MCU_GRID_POSITIONS[item.id];
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
    .filter((item) => !MCU_GRID_POSITIONS[item.id])
    .sort((a, b) => a.order - b.order);

  for (const item of overflow) {
    const row = orderToGridRow(item.order);
    const slot = overflowRowSlots.get(row) ?? 0;
    overflowRowSlots.set(row, slot + 1);

    const x = gridX(GRID_OVERFLOW_COL);
    let y = gridY(row) + slot * OVERFLOW_STAGGER;
    y = resolveColumnCollision(x, y, item, positioned);

    positioned.set(item.id, {
      item,
      layer: layers.get(item.id) ?? 0,
      x,
      y,
      column: GRID_OVERFLOW_COL,
    });
  }

  const edges: DependencyEdge[] = [];
  for (const item of items) {
    for (const dependencyId of item.dependsOn) {
      if (byId.has(dependencyId)) {
        edges.push({ from: dependencyId, to: item.id });
      }
    }
  }

  const nodes = items
    .map((item) => positioned.get(item.id))
    .filter((node): node is PositionedNode => Boolean(node));

  const maxY = Math.max(...nodes.map((node) => node.y), GRID_PADDING_Y);
  const maxCol = Math.max(
    ...nodes.map((node) => node.column),
    GRID_OVERFLOW_COL,
  );

  return {
    nodes,
    edges,
    width: GRID_PADDING_X + (maxCol + 2) * GRID_COL_WIDTH,
    height: maxY + GRID_ROW_HEIGHT * 1.5,
  };
}

export function computeProgress(items: readonly McuItem[], checked: Set<string>) {
  const total = items.length;
  const done = items.reduce((acc, item) => acc + (checked.has(item.id) ? 1 : 0), 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

/** Arête orthogonale entre deux nœuds */
export function edgePathBetween(
  fromX: number,
  fromY: number,
  fromHeight: number,
  toX: number,
  toY: number,
  toHeight: number,
) {
  const startX = fromX;
  const startY = fromY + fromHeight / 2;
  const endX = toX;
  const endY = toY - toHeight / 2;

  if (Math.abs(startX - endX) < 8) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const routeY = startY + (endY - startY) * 0.55;
  return `M ${startX} ${startY} L ${startX} ${routeY} L ${endX} ${routeY} L ${endX} ${endY}`;
}
