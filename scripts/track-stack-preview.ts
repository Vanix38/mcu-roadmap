import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McuDataSchema } from "../src/lib/mcu";
import { LAYOUT_OVERRIDES } from "../src/lib/layout-solver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/mcu.json"), "utf8"),
);
const items = McuDataSchema.parse(data);
const tracks = ["iron", "cap", "thor", "antman", "guardians", "hulk", "spidey"] as const;

for (const track of tracks) {
  const list = items.filter((i) => i.track === track).sort((a, b) => a.order - b.order);
  console.log("---", track);
  list.forEach((item, i) => {
    const o = LAYOUT_OVERRIDES[item.id];
    console.log(i, item.order, item.id, "row", o?.row, "col", o?.col);
  });
}
