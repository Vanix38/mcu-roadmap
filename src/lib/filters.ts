import type { McuItem } from "./mcu";
import { canCheckItem } from "./dependencies";

export type FilterType = "All" | "movie" | "series" | "special";
export type FilterStatus = "all" | "available" | "done" | "locked";

export interface RoadmapFilters {
  type: FilterType;
  status: FilterStatus;
  phases: ReadonlySet<string>;
}

export const DEFAULT_FILTERS: RoadmapFilters = {
  type: "All",
  status: "all",
  phases: new Set(),
};

export function applyFilters(
  items: readonly McuItem[],
  filters: RoadmapFilters,
  checked: Set<string>,
): McuItem[] {
  return items.filter((item) => {
    if (filters.type !== "All" && item.type !== filters.type) return false;

    if (filters.phases.size > 0 && !filters.phases.has(item.phase)) return false;

    if (filters.status !== "all") {
      const isDone = checked.has(item.id);
      const isAvailable = !isDone && canCheckItem(item, checked);
      const isLocked = !isDone && !isAvailable;

      if (filters.status === "done" && !isDone) return false;
      if (filters.status === "available" && !isAvailable) return false;
      if (filters.status === "locked" && !isLocked) return false;
    }

    return true;
  });
}

export function countActiveFilters(filters: RoadmapFilters): number {
  let count = 0;
  if (filters.type !== "All") count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.phases.size > 0) count += 1;
  return count;
}

export function resetFilters(): RoadmapFilters {
  return { type: "All", status: "all", phases: new Set() };
}
