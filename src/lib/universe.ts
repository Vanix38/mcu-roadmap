import type { McuItem, McuStudio } from "./mcu";
import { compactGridPositions } from "./layout-solver";

export { compactGridPositions };

export const UNIVERSES = ["mcu", "fox", "sony", "tv", "all"] as const;

export type UniverseId = (typeof UNIVERSES)[number];

export type ConcreteUniverseId = Exclude<UniverseId, "all">;

export const DEFAULT_UNIVERSE: UniverseId = "mcu";

export const UNIVERSE_LABELS: Record<UniverseId, string> = {
  mcu: "MCU",
  fox: "Fox",
  sony: "Sony",
  tv: "TV",
  all: "Tout",
};

const STUDIO_TO_UNIVERSE: Record<McuStudio, ConcreteUniverseId> = {
  marvel: "mcu",
  fox: "fox",
  sony: "sony",
  "sony-animation": "sony",
  netflix: "tv",
  abc: "tv",
  freeform: "tv",
  hulu: "tv",
};

export function isUniverseId(value: unknown): value is UniverseId {
  return (
    typeof value === "string" &&
    (UNIVERSES as readonly string[]).includes(value)
  );
}

export function getItemUniverse(item: McuItem): ConcreteUniverseId {
  return STUDIO_TO_UNIVERSE[item.studio];
}

/** Séries / spéciaux TV (tous studios : Disney+, Netflix, ABC, Fox, Sony…). */
export function isTvContent(item: McuItem) {
  return item.type === "series" || item.type === "special";
}

export function filterByUniverse(
  items: readonly McuItem[],
  universe: UniverseId,
): McuItem[] {
  if (universe === "all") return [...items];
  if (universe === "tv") return items.filter(isTvContent);
  return items.filter((item) => getItemUniverse(item) === universe);
}

export type UniversePortal = {
  fromId: string;
  toId: string;
  fromUniverse: ConcreteUniverseId;
  toUniverse: ConcreteUniverseId;
  direction: "in" | "out";
  targetUniverse: ConcreteUniverseId;
  targetId: string;
  label: string;
};

/** Portails cross-univers pour un nœud dans l'univers courant (vide si `all`). */
export function getUniversePortals(
  itemId: string,
  universe: UniverseId,
  catalogItems: readonly McuItem[],
): UniversePortal[] {
  if (universe === "all") return [];

  const byId = new Map(catalogItems.map((item) => [item.id, item]));
  const item = byId.get(itemId);
  if (!item) return [];

  const itemUniverse = getItemUniverse(item);
  if (itemUniverse !== universe) return [];

  const portals: UniversePortal[] = [];

  for (const depId of item.dependsOn) {
    const dep = byId.get(depId);
    if (!dep) continue;
    const depUniverse = getItemUniverse(dep);
    if (depUniverse === itemUniverse) continue;
    portals.push({
      fromId: depId,
      toId: itemId,
      fromUniverse: depUniverse,
      toUniverse: itemUniverse,
      direction: "in",
      targetUniverse: depUniverse,
      targetId: depId,
      label: `← ${UNIVERSE_LABELS[depUniverse]}`,
    });
  }

  for (const child of catalogItems) {
    if (!child.dependsOn.includes(itemId)) continue;
    const childUniverse = getItemUniverse(child);
    if (childUniverse === itemUniverse) continue;
    portals.push({
      fromId: itemId,
      toId: child.id,
      fromUniverse: itemUniverse,
      toUniverse: childUniverse,
      direction: "out",
      targetUniverse: childUniverse,
      targetId: child.id,
      label: `→ ${UNIVERSE_LABELS[childUniverse]}`,
    });
  }

  return portals;
}
