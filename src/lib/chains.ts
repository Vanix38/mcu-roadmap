import type { McuItem } from "./mcu";
import { getSeasonLabel, MOVIE_CHAIN_WHITELIST, seriesBaseTitle } from "./mcu";
import { canCheckItem } from "./dependency-graph";

export { MOVIE_CHAIN_WHITELIST };

export type CollapsedChain = {
  id: string;
  title: string;
  members: McuItem[];
  kind: "series" | "movies";
};

export type GraphNodeItem =
  | { type: "item"; item: McuItem }
  | { type: "chain"; chain: CollapsedChain };

function seasonNumber(item: McuItem): number | null {
  const label = getSeasonLabel(item);
  if (!label) return null;
  const n = Number(label.slice(1));
  return Number.isFinite(n) ? n : null;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isLinearChain(members: McuItem[], byId: Map<string, McuItem>) {
  if (members.length < 2) return false;
  const memberIds = new Set(members.map((m) => m.id));

  for (let i = 0; i < members.length; i += 1) {
    const item = members[i];

    if (i === 0) {
      // Entry may depend on anything outside the chain, but not on later members
      if (item.dependsOn.some((id) => memberIds.has(id))) return false;
    } else {
      // Strict: only the previous member as dependency
      if (
        item.dependsOn.length !== 1 ||
        item.dependsOn[0] !== members[i - 1].id
      ) {
        return false;
      }
    }

    // Mid members must not be depended on by anything outside the chain
    if (i < members.length - 1) {
      for (const other of byId.values()) {
        if (memberIds.has(other.id)) continue;
        if (other.dependsOn.includes(item.id)) return false;
      }
    }
  }

  return true;
}

function detectSeriesChains(
  items: readonly McuItem[],
  byId: Map<string, McuItem>,
): CollapsedChain[] {
  const groups = new Map<string, McuItem[]>();

  for (const item of items) {
    if (item.type !== "series") continue;
    if (!getSeasonLabel(item)) continue;
    const base = seriesBaseTitle(item.title);
    const list = groups.get(base);
    if (list) list.push(item);
    else groups.set(base, [item]);
  }

  const chains: CollapsedChain[] = [];

  for (const [base, group] of groups) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => (seasonNumber(a) ?? 0) - (seasonNumber(b) ?? 0),
    );
    // Require consecutive season numbers
    const nums = sorted.map(seasonNumber);
    if (nums.some((n) => n === null)) continue;
    let consecutive = true;
    for (let i = 1; i < nums.length; i += 1) {
      if (nums[i]! !== nums[i - 1]! + 1) {
        consecutive = false;
        break;
      }
    }
    if (!consecutive) continue;
    if (!isLinearChain(sorted, byId)) continue;

    chains.push({
      id: `chain:${slugify(base)}`,
      title: base,
      members: sorted,
      kind: "series",
    });
  }

  return chains;
}

function detectMovieChains(
  items: readonly McuItem[],
  byId: Map<string, McuItem>,
): CollapsedChain[] {
  const present = new Set(items.map((i) => i.id));
  const chains: CollapsedChain[] = [];

  for (const whitelist of MOVIE_CHAIN_WHITELIST) {
    const members = whitelist
      .filter((id) => present.has(id))
      .map((id) => byId.get(id)!)
      .filter(Boolean);
    if (members.length < 2) continue;
    if (!isLinearChain(members, byId)) continue;

    const title = members[0].title
      .replace(/:\s*.+$/, "")
      .replace(/\s+\d+$/, "")
      .trim();

    chains.push({
      id: `chain:${slugify(whitelist[0])}`,
      title,
      members,
      kind: "movies",
    });
  }

  return chains;
}

export function detectChains(
  items: readonly McuItem[],
  options?: { movies?: boolean; series?: boolean },
): CollapsedChain[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const chains: CollapsedChain[] = [];
  if (options?.series !== false) chains.push(...detectSeriesChains(items, byId));
  if (options?.movies !== false) chains.push(...detectMovieChains(items, byId));
  return chains;
}

export type CollapseResult = {
  /** Items synthétiques pour le layout (chaînes + items restants). */
  layoutItems: McuItem[];
  chainsById: Map<string, CollapsedChain>;
  memberToChain: Map<string, string>;
  nodes: GraphNodeItem[];
};

function remapDep(
  depId: string,
  memberToChain: Map<string, string>,
  selfChainId: string | undefined,
): string | null {
  const chainId = memberToChain.get(depId);
  if (!chainId) return depId;
  if (chainId === selfChainId) return null;
  return chainId;
}

/** Construit un McuItem synthétique représentant une chaîne. */
export function chainToLayoutItem(chain: CollapsedChain): McuItem {
  const first = chain.members[0];
  const last = chain.members[chain.members.length - 1];
  const externalDeps = first.dependsOn.filter(
    (id) => !chain.members.some((m) => m.id === id),
  );

  return {
    ...first,
    id: chain.id,
    title: chain.title,
    releaseDate: first.releaseDate,
    order: first.order,
    dependsOn: externalDeps,
    // Keep last release for timeline median bias toward span end when needed
    runtimeMin: first.runtimeMin,
  };
}

export function collapseItems(
  items: readonly McuItem[],
  options?: { movies?: boolean; series?: boolean },
): CollapseResult {
  const byId = new Map(items.map((item) => [item.id, item]));
  const chains = detectChains(items, options);
  const memberToChain = new Map<string, string>();
  const chainsById = new Map<string, CollapsedChain>();

  for (const chain of chains) {
    chainsById.set(chain.id, chain);
    for (const member of chain.members) {
      memberToChain.set(member.id, chain.id);
    }
  }

  const consumed = new Set(memberToChain.keys());
  const nodes: GraphNodeItem[] = [];
  const layoutItems: McuItem[] = [];

  for (const chain of chains) {
    nodes.push({ type: "chain", chain });
    const synthetic = chainToLayoutItem(chain);
    // Remap entry deps that point into other chains
    synthetic.dependsOn = synthetic.dependsOn
      .map((id) => remapDep(id, memberToChain, chain.id))
      .filter((id): id is string => Boolean(id));
    // Dedupe
    synthetic.dependsOn = [...new Set(synthetic.dependsOn)];
    layoutItems.push(synthetic);
  }

  for (const item of items) {
    if (consumed.has(item.id)) continue;
    nodes.push({ type: "item", item });
    const remapped = item.dependsOn
      .map((id) => remapDep(id, memberToChain, undefined))
      .filter((id): id is string => Boolean(id));
    layoutItems.push({
      ...item,
      dependsOn: [...new Set(remapped)],
    });
  }

  return { layoutItems, chainsById, memberToChain, nodes };
}

export function isChainId(id: string) {
  return id.startsWith("chain:");
}

export function getChainProgress(chain: CollapsedChain, checked: Set<string>) {
  const done = chain.members.filter((m) => checked.has(m.id)).length;
  return { done, total: chain.members.length };
}

export function getChainDisplayItem(
  chain: CollapsedChain,
  checked: Set<string>,
): McuItem {
  const next = chain.members.find((m) => !checked.has(m.id));
  return next ?? chain.members[chain.members.length - 1];
}

export function getChainRangeLabel(chain: CollapsedChain) {
  if (chain.kind === "series") {
    const first = getSeasonLabel(chain.members[0]);
    const last = getSeasonLabel(chain.members[chain.members.length - 1]);
    if (first && last) return `${first}–${last}`;
  }
  return `${chain.members.length}`;
}

/** Ajoute les ids de chaînes entièrement vues pour canCheckItem sur items synthétiques. */
export function withChainChecked(
  checked: Set<string>,
  chainsById: Map<string, CollapsedChain>,
): Set<string> {
  const next = new Set(checked);
  for (const chain of chainsById.values()) {
    if (chain.members.every((m) => checked.has(m.id))) next.add(chain.id);
  }
  return next;
}

export function isChainFullyChecked(chain: CollapsedChain, checked: Set<string>) {
  return chain.members.every((m) => checked.has(m.id));
}

export function isChainAvailable(chain: CollapsedChain, checked: Set<string>) {
  const next = chain.members.find((m) => !checked.has(m.id));
  if (!next) return false;
  return canCheckItem(next, checked);
}
