import {
  DEFAULT_VIEW_MODE,
  isViewMode,
  type ViewMode,
} from "./view-mode";
import {
  DEFAULT_UNIVERSE,
  isUniverseId,
  type UniverseId,
} from "./universe";

const KEY = "mcuRoadmap.v1" as const;
const VIEW_MODE_KEY = "mcuRoadmap.viewMode.v1" as const;
const UNIVERSE_KEY = "mcuRoadmap.universe.v1" as const;

export type RoadmapSession = {
  checkedIds: string[];
  updatedAt: string;
};

export function readRoadmapSession(): RoadmapSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("checkedIds" in parsed) ||
      !Array.isArray((parsed as Record<string, unknown>).checkedIds)
    ) {
      return null;
    }

    const checkedIdsRaw = (parsed as Record<string, unknown>).checkedIds as unknown[];
    const checkedIds = checkedIdsRaw.filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );

    const updatedAt =
      typeof (parsed as Record<string, unknown>).updatedAt === "string"
        ? ((parsed as Record<string, unknown>).updatedAt as string)
        : new Date().toISOString();

    return { checkedIds, updatedAt };
  } catch {
    return null;
  }
}

export function writeRoadmapSession(checkedIds: string[]) {
  if (typeof window === "undefined") return;

  const value: RoadmapSession = {
    checkedIds: Array.from(new Set(checkedIds)).sort(),
    updatedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(KEY, JSON.stringify(value));
}

export function clearRoadmapSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}

export function readViewMode(): ViewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VIEW_MODE_KEY);
    if (isViewMode(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeViewMode(mode: ViewMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function readUniverse(): UniverseId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(UNIVERSE_KEY);
    if (isUniverseId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeUniverse(universe: UniverseId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UNIVERSE_KEY, universe);
  } catch {
    /* ignore */
  }
}

export { DEFAULT_VIEW_MODE, DEFAULT_UNIVERSE };
