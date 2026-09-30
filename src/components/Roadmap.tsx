"use client";

import { useCallback, useMemo, useState } from "react";
import type { McuItem } from "@/lib/mcu";
import { canCheckItem, computeProgress } from "@/lib/dependency-graph";
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  resetFilters,
  type RoadmapFilters,
} from "@/lib/filters";
import { useCheckedSession } from "@/lib/use-checked-session";
import { usePersistedPrefs } from "@/lib/use-persisted-prefs";
import type { ViewMode } from "@/lib/view-mode";
import {
  filterByUniverse,
  type UniverseId,
} from "@/lib/universe";
import { withBasePath } from "@/lib/media";
import { useIsMobile } from "@/lib/use-media-query";
import { BottomSheet } from "./BottomSheet";
import { Filters } from "./Filters";
import { ItemDetailSheet } from "./ItemDetailSheet";
import { Legend } from "./Legend";
import { MobileActionBar } from "./MobileActionBar";
import { RoadmapJourney } from "./RoadmapJourney";
import { RoadmapList } from "./RoadmapList";
import { RoadmapTree } from "./RoadmapTree";
import { StackDetailSheet } from "./StackDetailSheet";
import { UniverseSwitcher } from "./UniverseSwitcher";
import { ViewSwitcher } from "./ViewSwitcher";
import type { CollapsedChain } from "@/lib/chains";

type Props = { items: McuItem[] };
type SheetKind = "search" | "filters" | "legend" | null;

export function Roadmap({ items }: Props) {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<RoadmapFilters>(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const { viewMode, setViewMode, universe, setUniverse } = usePersistedPrefs();
  const { checked, loadedAt, toggle, resetAll } = useCheckedSession(items);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<CollapsedChain | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [openSheet, setOpenSheet] = useState<SheetKind>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const universeItems = useMemo(
    () => filterByUniverse(items, universe),
    [items, universe],
  );

  const filtered = useMemo(() => {
    const base = applyFilters(items, filters, checked);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((it) => it.title.toLowerCase().includes(q));
  }, [items, filters, checked, query]);

  const filteredGraph = useMemo(() => {
    const ids = new Set(universeItems.map((item) => item.id));
    return filtered.filter((item) => ids.has(item.id));
  }, [filtered, universeItems]);

  const filteredForJourney = useMemo(() => {
    const base = applyFilters(
      items,
      { ...filters, status: "all" },
      checked,
    );
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((it) => it.title.toLowerCase().includes(q));
  }, [items, filters, checked, query]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((it) => it.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [items, query]);

  const progress = useMemo(() => computeProgress(items, checked), [items, checked]);

  const phaseStats = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    const order: string[] = [];
    for (const item of items) {
      if (!map.has(item.phase)) {
        map.set(item.phase, { done: 0, total: 0 });
        order.push(item.phase);
      }
      const stat = map.get(item.phase)!;
      stat.total += 1;
      if (checked.has(item.id)) stat.done += 1;
    }
    return order.map((phase) => ({ phase, ...map.get(phase)! }));
  }, [items, checked]);

  const selectedItem = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  const filterCount = countActiveFilters(
    viewMode === "journey" ? { ...filters, status: "all" } : filters,
  );

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, [setViewMode]);

  const handleUniverse = useCallback((next: UniverseId) => {
    setUniverse(next);
  }, [setUniverse]);

  const handlePortalNavigate = useCallback(
    (nextUniverse: UniverseId, id: string) => {
      setUniverse(nextUniverse);
      setFocusId(id);
      setSelectedId(id);
    },
    [setUniverse],
  );

  const handleSwitchView = useCallback((mode: ViewMode, id: string) => {
    setViewMode(mode);
    setFocusId(id);
  }, [setViewMode]);

  const handleSelect = useCallback((item: McuItem) => {
    setSelectedChain(null);
    setSelectedId(item.id);
    setFocusId(item.id);
    setFocusNonce((n) => n + 1);
  }, []);

  const handleSelectChain = useCallback((chain: CollapsedChain) => {
    setSelectedId(null);
    setSelectedChain(chain);
  }, []);

  const handleSearchPick = useCallback((item: McuItem) => {
    setOpenSheet(null);
    setQuery("");
    setFocusId(item.id);
    setSelectedId(item.id);
  }, []);

  const statusLabel = (item: McuItem) => {
    if (checked.has(item.id)) return "Vu";
    if (canCheckItem(item, checked)) return "À voir";
    return "Verrouillé";
  };

  return (
    <div
      className={[
        "relative z-[1] flex h-dvh flex-col overflow-hidden",
        isMobile ? "has-action-bar" : "",
      ].join(" ")}
    >
      <header
        className={[
          "app-header px-4 sm:px-6",
          headerCollapsed && !isMobile ? "app-header--collapsed" : "py-3",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={withBasePath("/images/marvel-studios-logo.png")}
                alt="Marvel Studios"
                className="header-logo"
              />
              Roadmap
            </h1>
            {!headerCollapsed || isMobile ? (
              <p className="text-xs text-[var(--muted)]">
                {progress.done}/{progress.total} films · {progress.pct}%
              </p>
            ) : (
              <p className="text-[0.65rem] text-[var(--muted)]">
                {progress.pct}% · {progress.done}/{progress.total}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isMobile ? (
              <ViewSwitcher value={viewMode} onChange={handleViewMode} />
            ) : null}

            {!isMobile && viewMode === "graph" ? (
              <UniverseSwitcher value={universe} onChange={handleUniverse} />
            ) : null}

            {!isMobile && !headerCollapsed ? (
              <button
                type="button"
                onClick={resetAll}
                className="h-9 rounded-lg border border-[var(--edge)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent-gold)]"
              >
                Tout décocher
              </button>
            ) : null}

            {!isMobile ? (
              <button
                type="button"
                className="header-collapse-btn"
                aria-expanded={!headerCollapsed}
                aria-controls="app-header-panel"
                aria-label={headerCollapsed ? "Déplier le panneau" : "Replier le panneau"}
                onClick={() => setHeaderCollapsed((v) => !v)}
              >
                <span aria-hidden="true">{headerCollapsed ? "▾" : "▴"}</span>
                <span className="header-collapse-label">
                  {headerCollapsed ? "Panneau" : "Replier"}
                </span>
              </button>
            ) : null}
          </div>
        </div>

        {!headerCollapsed || isMobile ? (
          <div id="app-header-panel">
            <div className="mt-3">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.pct}%` }}
                  role="progressbar"
                  aria-valuenow={progress.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {isMobile ? (
              <div className="mt-3 flex flex-col gap-2">
                <ViewSwitcher value={viewMode} onChange={handleViewMode} />
                {viewMode === "graph" ? (
                  <UniverseSwitcher value={universe} onChange={handleUniverse} />
                ) : null}
              </div>
            ) : null}

            {!isMobile ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {phaseStats.map(({ phase, done, total }) => (
                    <span key={phase} className="phase-chip">
                      {phase.replace("Phase ", "P")}
                      <strong>
                        {done}/{total}
                      </strong>
                    </span>
                  ))}
                </div>

                <Filters
                  filters={filters}
                  onChange={setFilters}
                  phases={phaseStats}
                  query={query}
                  onQuery={setQuery}
                  showSearch
                  hideStatus={viewMode === "journey"}
                />

                <Legend />

                {loadedAt ? (
                  <p className="text-[0.65rem] text-[var(--muted)]">
                    Session: {new Date(loadedAt).toLocaleString("fr-FR")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {viewMode === "journey" ? (
        <RoadmapJourney
          items={filteredForJourney}
          allItems={items}
          checked={checked}
          focusId={focusId}
          onToggle={toggle}
          onSelect={handleSelect}
          onResetFilters={() => setFilters(resetFilters())}
        />
      ) : viewMode === "list" ? (
        <RoadmapList
          items={filtered}
          allItems={items}
          checked={checked}
          focusId={focusId}
          onToggle={toggle}
          onSelect={handleSelect}
          onResetFilters={() => setFilters(resetFilters())}
        />
      ) : !isMobile ? (
        <div className="split-pane">
          <aside className="split-pane-list">
            <RoadmapList
              items={filteredGraph}
              allItems={universeItems}
              checked={checked}
              focusId={selectedId ?? focusId}
              onToggle={toggle}
              onSelect={handleSelect}
              onResetFilters={() => setFilters(resetFilters())}
            />
          </aside>
          <main className="split-pane-graph">
            <RoadmapTree
              allItems={universeItems}
              catalogItems={items}
              visibleItems={filteredGraph}
              checked={checked}
              focusId={focusId}
              focusNonce={focusNonce}
              selectedId={selectedId}
              isMobile={isMobile}
              compactLayout={universe !== "all"}
              universe={universe}
              onToggle={toggle}
              onSelect={handleSelect}
              onSelectChain={handleSelectChain}
              onPortalNavigate={handlePortalNavigate}
            />
          </main>
        </div>
      ) : (
        <RoadmapTree
          allItems={universeItems}
          catalogItems={items}
          visibleItems={filteredGraph}
          checked={checked}
          focusId={focusId}
          focusNonce={focusNonce}
          selectedId={selectedId}
          isMobile={isMobile}
          compactLayout={universe !== "all"}
          universe={universe}
          onToggle={toggle}
          onSelect={handleSelect}
          onSelectChain={handleSelectChain}
          onPortalNavigate={handlePortalNavigate}
        />
      )}

      {isMobile ? (
        <MobileActionBar
          openSheet={openSheet}
          onOpenSheet={setOpenSheet}
          filterCount={filterCount}
        />
      ) : null}

      <StackDetailSheet
        chain={selectedChain}
        checked={checked}
        onClose={() => setSelectedChain(null)}
        onToggle={toggle}
        onSelectMember={(item) => {
          setSelectedChain(null);
          setSelectedId(item.id);
        }}
      />

      <BottomSheet
        open={openSheet === "search"}
        onClose={() => setOpenSheet(null)}
        title="Recherche"
        size="full"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--muted)]">Recherche</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Iron Man, Avengers..."
            className="filter-input"
            aria-label="Rechercher un film"
            autoFocus
          />
        </label>
        <div className="search-results" role="listbox" aria-label="Résultats">
          {searchResults.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              className="search-result"
              aria-selected={false}
              onClick={() => handleSearchPick(item)}
            >
              <span>{item.title}</span>
              <span className="search-result-meta">
                {item.releaseDate.slice(0, 4)} · {statusLabel(item)}
              </span>
            </button>
          ))}
          {query.trim() && searchResults.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Aucun résultat.</p>
          ) : null}
        </div>
      </BottomSheet>

      <BottomSheet
        open={openSheet === "filters"}
        onClose={() => setOpenSheet(null)}
        title="Filtres"
        size="full"
      >
        <Filters
          filters={filters}
          onChange={setFilters}
          phases={phaseStats}
          compact
          showSearch={false}
          hideStatus={viewMode === "journey"}
        />
        <div className="filter-actions">
          <button
            type="button"
            className="detail-btn"
            onClick={() => setFilters(resetFilters())}
          >
            Réinitialiser les filtres
          </button>
          <button type="button" className="detail-btn" onClick={resetAll}>
            Tout décocher
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={openSheet === "legend"}
        onClose={() => setOpenSheet(null)}
        title="Légende"
        size="half"
      >
        <Legend />
      </BottomSheet>

      <ItemDetailSheet
        item={selectedItem}
        allItems={items}
        checked={checked}
        viewMode={viewMode}
        isMobile={isMobile}
        onClose={() => setSelectedId(null)}
        onToggle={toggle}
        onSelect={handleSelect}
        onSwitchView={handleSwitchView}
      />
    </div>
  );
}
