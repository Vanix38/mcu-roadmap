import type { McuItem } from "./mcu";

export function canCheckItem(item: McuItem, checked: Set<string>) {
  return item.dependsOn.every((dependencyId) => checked.has(dependencyId));
}

/** Premier item non vu dont les prérequis sont tous cochés, trié par `order`. */
export function getNextAvailable(
  items: readonly McuItem[],
  checked: Set<string>,
): McuItem | null {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  return (
    sorted.find((item) => !checked.has(item.id) && canCheckItem(item, checked)) ??
    null
  );
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

export function computeProgress(items: readonly McuItem[], checked: Set<string>) {
  const total = items.length;
  const done = items.reduce((acc, item) => acc + (checked.has(item.id) ? 1 : 0), 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}
