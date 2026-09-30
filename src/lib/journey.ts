import type { McuItem } from "./mcu";
import { canCheckItem, getNextAvailable } from "./dependency-graph";

export interface JourneySoonEntry {
  item: McuItem;
  missing: McuItem[];
}

export interface Journey {
  next: McuItem | null;
  available: McuItem[];
  soon: JourneySoonEntry[];
  done: McuItem[];
  unlocksById: Map<string, McuItem[]>;
}

function byOrder(a: McuItem, b: McuItem) {
  return a.order - b.order;
}

export function buildJourney(
  items: readonly McuItem[],
  checked: Set<string>,
): Journey {
  const byId = new Map(items.map((item) => [item.id, item]));
  const unlocksById = new Map<string, McuItem[]>();

  for (const item of items) {
    for (const depId of item.dependsOn) {
      const list = unlocksById.get(depId);
      if (list) list.push(item);
      else unlocksById.set(depId, [item]);
    }
  }

  for (const list of unlocksById.values()) list.sort(byOrder);

  const done: McuItem[] = [];
  const availableAll: McuItem[] = [];
  const soon: JourneySoonEntry[] = [];

  for (const item of [...items].sort(byOrder)) {
    if (checked.has(item.id)) {
      done.push(item);
      continue;
    }

    if (canCheckItem(item, checked)) {
      availableAll.push(item);
      continue;
    }

    const missing = item.dependsOn
      .filter((id) => !checked.has(id))
      .map((id) => byId.get(id))
      .filter((dep): dep is McuItem => Boolean(dep));

    if (missing.length === 1) {
      soon.push({ item, missing });
    }
  }

  const next = getNextAvailable(items, checked);
  const available = next
    ? availableAll.filter((item) => item.id !== next.id)
    : availableAll;

  return { next, available, soon, done, unlocksById };
}
