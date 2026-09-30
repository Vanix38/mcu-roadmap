import type { McuItem } from "./mcu";
import {
  GRID_COL_WIDTH,
  GRID_PADDING_X,
  GRID_PADDING_Y,
  GRID_ROW_HEIGHT,
  gridX,
  gridY,
  orderToGridCol,
} from "./grid-layout";
import { getGridPositions } from "./layout-solver";
import { getNodeDimensions } from "./node-dimensions";
import {
  routeEdges,
  type DependencyEdge,
  type RoutedEdge,
} from "./edge-routing";

export type { RoutedEdge } from "./edge-routing";
export { edgeId, pathMidpoint, scaleRoutedEdgePath } from "./edge-routing";

export { getNodeDimensions } from "./node-dimensions";
export { LAYOUT_REVISION } from "./layout-solver";

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

export function buildDependencyLayout(
  items: readonly McuItem[],
  options?: {
    compact?: boolean;
    extraOverrides?: Record<string, import("./layout-solver").GridPos>;
    trackOrder?: readonly import("./mcu").McuTrack[];
    exclusiveLanes?: Partial<
      Record<import("./mcu").McuTrack, readonly string[]>
    >;
  },
): DependencyLayout {
  const layers = computeLayers(items);
  const byId = new Map(items.map((item) => [item.id, item]));
  const gridPositions = getGridPositions(items, {
    compact: options?.compact,
    extraOverrides: options?.extraOverrides,
    trackOrder: options?.trackOrder,
    exclusiveLanes: options?.exclusiveLanes,
  });
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

  const positionedRows = Object.values(gridPositions).map((p) => p.row);
  const overflowRow = Math.max(1, ...positionedRows) + 1;

  for (const item of overflow) {
    const col = orderToGridCol(item.order);
    const slot = overflowColSlots.get(col) ?? 0;
    overflowColSlots.set(col, slot + 1);

    const y = gridY(overflowRow);
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
    1,
    ...nodes.map((node) => node.column),
    ...Object.values(gridPositions).map((p) => p.col),
  );
  const maxRow = Math.max(
    1,
    ...positionedRows,
    overflow.length > 0 ? overflowRow : 1,
  );

  return {
    nodes,
    edges,
    width: GRID_PADDING_X + (maxCol + 2) * GRID_COL_WIDTH,
    height: GRID_PADDING_Y + (maxRow + 2) * GRID_ROW_HEIGHT,
  };
}
