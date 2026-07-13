import type { McuItem } from "./mcu";
import { isMilestone } from "./mcu";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 110;
const MILESTONE_NODE_WIDTH = 400;
const MILESTONE_NODE_HEIGHT = 200;

export function getNodeDimensions(item: McuItem) {
  if (isMilestone(item.id)) {
    return { width: MILESTONE_NODE_WIDTH, height: MILESTONE_NODE_HEIGHT };
  }
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}
