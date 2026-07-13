type Props = {
  type: string;
  onType: (value: string) => void;
  query: string;
  onQuery: (value: string) => void;
};

const TYPE_OPTIONS = [
  { value: "All", label: "Tous" },
  { value: "movie", label: "Films" },
  { value: "series", label: "Séries" },
  { value: "special", label: "Spéciaux" },
] as const;

export function Filters({ type, onType, query, onQuery }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--muted)]">Type</span>
        <div className="segmented" role="group" aria-label="Filtrer par type">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={[
                "segmented-btn",
                type === opt.value ? "segmented-btn--active" : "",
              ].join(" ")}
              onClick={() => onType(opt.value)}
              aria-pressed={type === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
