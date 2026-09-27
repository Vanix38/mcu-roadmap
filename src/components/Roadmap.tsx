"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { McuItem } from "@/lib/mcu";
import { computeProgress, getDescendantIds, canCheckItem } from "@/lib/dependencies";
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  resetFilters,
  type RoadmapFilters,
} from "@/lib/filters";
import {
  clearRoadmapSession,
  readRoadmapSession,
  writeRoadmapSession,
} from "@/lib/storage";
import { withBasePath } from "@/lib/media";
import { useIsMobile } from "@/lib/use-media-query";
import { BottomSheet } from "./BottomSheet";
import { Filters } from "./Filters";
import { ItemDetailSheet } from "./ItemDetailSheet";
import { Legend } from "./Legend";
import { MobileActionBar } from "./MobileActionBar";
import { RoadmapList } from "./RoadmapList";
import { RoadmapTree } from "./RoadmapTree";

type Props = { items: McuItem[] };
type ViewMode = "list" | "graph";
type SheetKind = "search" | "filters" | "legend" | null;

export function Roadmap({ items }: Props) {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<RoadmapFilters>(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [viewModeOverride, setViewModeOverride] = useState<ViewMode | null>(null);
  const viewMode: ViewMode = viewModeOverride ?? (isMobile ? "list" : "graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [openSheet, setOpenSheet] = useState<SheetKind>(null);

  const [checked, setChecked] = useState<Set<string>>(() => {
    const session = readRoadmapSession();
    return session ? new Set(session.checkedIds) : new Set();
  });
  const [loadedAt, setLoadedAt] = useState<string | null>(() => {
    const session = readRoadmapSession();
    return session?.updatedAt ?? null;
  });
  const firstSaveSkipRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (firstSaveSkipRef.current) {
      firstSaveSkipRef.current = false;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      writeRoadmapSession(Array.from(checked));
      setLoadedAt(new Date().toISOString());
    }, 350);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [checked]);

  const filtered = useMemo(() => {
    const base = applyFilters(items, filters, checked);
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

  const filterCount = countActiveFilters(filters);

  function toggle(item: McuItem) {
    setChecked((prev) => {
      const next = new Set(prev);

      if (next.has(item.id)) {
        next.delete(item.id);
        for (const descendantId of getDescendantIds(items, item.id)) {
          next.delete(descendantId);
        }
        return next;
      }

      if (!canCheckItem(item, next)) return next;
      next.add(item.id);
      return next;
    });
  }

  function resetAll() {
    if (!window.confirm("Tout décocher et effacer la session ?")) return;
    setChecked(new Set());
    clearRoadmapSession();
    setLoadedAt(null);
  }

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewModeOverride(mode);
  }, []);

  const handleSwitchView = useCallback(
    (mode: ViewMode, id: string) => {
      setViewModeOverride(mode);
      setFocusId(id);
    },
    [],
  );

  const handleSelect = useCallback((item: McuItem) => {
    setSelectedId(item.id);
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
      <header className="app-header px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={withBasePath("/images/marvel-studios-logo.png")}
                alt="Marvel Studios"
                className="header-logo"
              />
              Roadmap
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {progress.done}/{progress.total} films · {progress.pct}%
            </p>
          </div>

          {!isMobile ? (
            <button
              onClick={resetAll}
              className="h-9 rounded-lg border border-[var(--edge)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent-gold)]"
            >
              Tout décocher
            </button>
          ) : null}
        </div>

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
            />

            <Legend />

            {loadedAt ? (
              <p className="text-[0.65rem] text-[var(--muted)]">
                Session: {new Date(loadedAt).toLocaleString("fr-FR")}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {isMobile && viewMode === "list" ? (
        <RoadmapList
          items={filtered}
          allItems={items}
          checked={checked}
          focusId={focusId}
          onToggle={toggle}
          onSelect={handleSelect}
          onResetFilters={() => setFilters(resetFilters())}
        />
      ) : (
        <RoadmapTree
          allItems={items}
          visibleItems={filtered}
          checked={checked}
          focusId={focusId}
          selectedId={selectedId}
          isMobile={isMobile}
          onToggle={toggle}
          onSelect={handleSelect}
        />
      )}

      {isMobile ? (
        <MobileActionBar
          viewMode={viewMode}
          onViewMode={handleViewMode}
          openSheet={openSheet}
          onOpenSheet={setOpenSheet}
          filterCount={filterCount}
        />
      ) : null}

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
