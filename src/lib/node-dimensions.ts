import type { McuItem } from "./mcu";

/** Affiche portrait 2:3 (128×192) */
const NODE_WIDTH = 128;
const NODE_HEIGHT = 192;

export function getNodeDimensions(_item: McuItem) {
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}
