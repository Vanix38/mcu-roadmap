"use client";

type SheetKind = "search" | "filters" | "legend" | null;
type ViewMode = "list" | "graph";

type Props = {
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  openSheet: SheetKind;
  onOpenSheet: (sheet: SheetKind) => void;
  filterCount: number;
};

export function MobileActionBar({
  viewMode,
  onViewMode,
  openSheet,
  onOpenSheet,
  filterCount,
}: Props) {
  const toggleSheet = (sheet: Exclude<SheetKind, null>) => {
    onOpenSheet(openSheet === sheet ? null : sheet);
  };

  return (
    <nav className="action-bar" aria-label="Actions">
      <button
        type="button"
        className={[
          "action-bar-btn",
          openSheet === "search" ? "action-bar-btn--active" : "",
        ].join(" ")}
        onClick={() => toggleSheet("search")}
        aria-pressed={openSheet === "search"}
        aria-label="Recherche"
      >
        <span className="action-bar-icon" aria-hidden="true">
          ⌕
        </span>
        Recherche
      </button>

      <button
        type="button"
        className={[
          "action-bar-btn",
          openSheet === "filters" ? "action-bar-btn--active" : "",
        ].join(" ")}
        onClick={() => toggleSheet("filters")}
        aria-pressed={openSheet === "filters"}
        aria-label={
          filterCount > 0 ? `Filtres, ${filterCount} actifs` : "Filtres"
        }
      >
        {filterCount > 0 ? (
          <span className="action-bar-badge">{filterCount}</span>
        ) : null}
        <span className="action-bar-icon" aria-hidden="true">
          ☰
        </span>
        Filtres
      </button>

      <button
        type="button"
        className={[
          "action-bar-btn",
          openSheet === "legend" ? "action-bar-btn--active" : "",
        ].join(" ")}
        onClick={() => toggleSheet("legend")}
        aria-pressed={openSheet === "legend"}
        aria-label="Légende"
      >
        <span className="action-bar-icon" aria-hidden="true">
          ⓘ
        </span>
        Légende
      </button>

      <button
        type="button"
        className="action-bar-btn"
        onClick={() => onViewMode(viewMode === "list" ? "graph" : "list")}
        aria-label={
          viewMode === "list" ? "Passer au graphe" : "Passer à la liste"
        }
      >
        <span className="action-bar-icon" aria-hidden="true">
          {viewMode === "list" ? "⧉" : "☰"}
        </span>
        {viewMode === "list" ? "Graphe" : "Liste"}
      </button>
    </nav>
  );
}
