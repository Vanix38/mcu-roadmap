import type { McuItem } from "./mcu";
import {
  buildDependencyLayout,
  type DependencyLayout,
} from "./dependencies";
import { collapseItems, type CollapseResult, type CollapsedChain } from "./chains";

export type CollapsedLayout = DependencyLayout & {
  collapse: CollapseResult;
};

/**
 * Layout graphe avec chaînes linéaires empilées.
 * Les items synthétiques de chaîne héritent piste + date du premier membre,
 * donc la grille année × piste les place directement.
 */
export function buildCollapsedLayout(
  items: readonly McuItem[],
  options?: {
    compact?: boolean;
    collapseMovies?: boolean;
    collapseSeries?: boolean;
    trackOrder?: readonly import("./mcu").McuTrack[];
    exclusiveLanes?: Partial<
      Record<import("./mcu").McuTrack, readonly string[]>
    >;
  },
): CollapsedLayout {
  const collapse = collapseItems(items, {
    movies: options?.collapseMovies,
    series: options?.collapseSeries,
  });

  const layout = buildDependencyLayout(collapse.layoutItems, {
    compact: options?.compact,
    trackOrder: options?.trackOrder,
    exclusiveLanes: options?.exclusiveLanes,
  });

  return { ...layout, collapse };
}

export function getChainForNodeId(
  collapse: CollapseResult,
  id: string,
): CollapsedChain | null {
  return collapse.chainsById.get(id) ?? null;
}
