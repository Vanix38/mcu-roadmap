import type { McuItem } from "./mcu";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 110;

export function getNodeDimensions(_item: McuItem) {
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}
