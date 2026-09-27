export type GraphView = { scale: number; tx: number; ty: number };

export type Size = { w: number; h: number };

export const MIN_SCALE = 0.12;
export const MAX_SCALE = 2;
export const DEFAULT_SCALE = 0.2;
export const READABLE_NODE_WIDTH = 224;
export const NODE_VISIBLE_COUNT = 2.6;
export const CLAMP_MARGIN = 0.4;

export function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Scale that shows ~NODE_VISIBLE_COUNT cards across the viewport */
export function fitScaleForReadableNode(containerW: number) {
  return clampScale(containerW / (READABLE_NODE_WIDTH * NODE_VISIBLE_COUNT));
}

export function zoomAt(
  view: GraphView,
  anchor: { x: number; y: number },
  factor: number,
): GraphView {
  const newScale = clampScale(view.scale * factor);
  const ratio = newScale / view.scale;
  return {
    scale: newScale,
    tx: anchor.x - (anchor.x - view.tx) * ratio,
    ty: anchor.y - (anchor.y - view.ty) * ratio,
  };
}

export function centerOn(
  container: Size,
  node: { x: number; y: number },
  scale: number,
): GraphView {
  const s = clampScale(scale);
  return {
    scale: s,
    tx: container.w / 2 - node.x * s,
    ty: container.h / 2 - node.y * s,
  };
}

export function fitOverview(
  container: Size,
  canvas: Size,
  maxScale = DEFAULT_SCALE,
): GraphView {
  const fitScale = Math.min(
    (container.w / canvas.w) * 0.95,
    (container.h / canvas.h) * 0.95,
    maxScale,
  );
  const scale = clampScale(fitScale);
  return {
    scale,
    tx: (container.w - canvas.w * scale) / 2,
    ty: (container.h - canvas.h * scale) / 2,
  };
}

/**
 * Keep at least CLAMP_MARGIN of the viewport overlapping the canvas
 * so the graph can never be panned completely off-screen.
 */
export function clampView(
  view: GraphView,
  canvas: Size,
  container: Size,
): GraphView {
  const scaledW = canvas.w * view.scale;
  const scaledH = canvas.h * view.scale;
  const marginX = container.w * CLAMP_MARGIN;
  const marginY = container.h * CLAMP_MARGIN;

  const minTx = marginX - scaledW;
  const maxTx = container.w - marginX;
  const minTy = marginY - scaledH;
  const maxTy = container.h - marginY;

  return {
    scale: view.scale,
    tx: Math.min(maxTx, Math.max(minTx, view.tx)),
    ty: Math.min(maxTy, Math.max(minTy, view.ty)),
  };
}
