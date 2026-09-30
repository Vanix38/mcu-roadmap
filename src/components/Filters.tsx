"use client";

import type { FilterStatus, FilterType, RoadmapFilters } from "@/lib/filters";

type Props = {
  filters: RoadmapFilters;
  onChange: (next: RoadmapFilters) => void;
  phases: readonly { phase: string; done: number; total: number }[];
  query?: string;
  onQuery?: (value: string) => void;
  showSearch?: boolean;
  compact?: boolean;
  hideStatus?: boolean;
};

const TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "All", label: "Tous" },
  { value: "movie", label: "Films" },
  { value: "series", label: "Séries" },
  { value: "special", label: "Spéciaux" },
];

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "available", label: "À voir" },
  { value: "done", label: "Vus" },
  { value: "locked", label: "Verrouillés" },
];

export function Filters({
  filters,
  onChange,
  phases,
  query = "",
  onQuery,
  showSearch = true,
  compact = false,
  hideStatus = false,
}: Props) {
  const togglePhase = (phase: string) => {
    const next = new Set(filters.phases);
    if (next.has(phase)) next.delete(phase);
    else next.add(phase);
    onChange({ ...filters, phases: next });
  };

  return (
    <div className="flex flex-col gap-3">
      {showSearch && onQuery ? (
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[var(--muted)]">Recherche</span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Iron Man, Avengers..."
            className="filter-input"
            aria-label="Rechercher un film"
          />
        </label>
      ) : null}

      <div className={compact ? "filter-group" : "flex flex-col gap-1"}>
        <span className={compact ? "filter-group-label" : "text-xs font-medium text-[var(--muted)]"}>
          Type
        </span>
        <div className="segmented" role="group" aria-label="Filtrer par type">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={[
                "segmented-btn",
                filters.type === opt.value ? "segmented-btn--active" : "",
              ].join(" ")}
              onClick={() => onChange({ ...filters, type: opt.value })}
              aria-pressed={filters.type === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {compact ? (
        <>
          {!hideStatus ? (
            <div className="filter-group">
              <span className="filter-group-label">Statut</span>
              <div className="filter-chips" role="group" aria-label="Filtrer par statut">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={[
                      "filter-chip",
                      filters.status === opt.value ? "filter-chip--active" : "",
                    ].join(" ")}
                    onClick={() => onChange({ ...filters, status: opt.value })}
                    aria-pressed={filters.status === opt.value}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="filter-group">
            <span className="filter-group-label">Phase</span>
            <div className="filter-chips" role="group" aria-label="Filtrer par phase">
              {phases.map(({ phase, done, total }) => {
                const active = filters.phases.has(phase);
                return (
                  <button
                    key={phase}
                    type="button"
                    className={[
                      "filter-chip",
                      active ? "filter-chip--active" : "",
                    ].join(" ")}
                    onClick={() => togglePhase(phase)}
                    aria-pressed={active}
                  >
                    {phase} ({done}/{total})
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
