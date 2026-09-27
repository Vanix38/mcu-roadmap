type Props = {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onProgress?: () => void;
  onOverview: () => void;
};

export function GraphControls({
  scale,
  onZoomIn,
  onZoomOut,
  onProgress,
  onOverview,
}: Props) {
  return (
    <div className="graph-controls" role="toolbar" aria-label="Contrôles du graphe">
      <button
        type="button"
        className="graph-btn"
        onClick={onZoomIn}
        aria-label="Zoom avant"
        title="Zoom avant"
      >
        +
      </button>
      <button
        type="button"
        className="graph-btn"
        onClick={onZoomOut}
        aria-label="Zoom arrière"
        title="Zoom arrière"
      >
        −
      </button>
      {onProgress ? (
        <button
          type="button"
          className="graph-btn"
          onClick={onProgress}
          aria-label="Ma progression"
          title="Ma progression"
          style={{ fontSize: "0.85rem" }}
        >
          ▶
        </button>
      ) : null}
      <button
        type="button"
        className="graph-btn"
        onClick={onOverview}
        aria-label="Vue d'ensemble"
        title="Vue d'ensemble"
        style={{ fontSize: "0.85rem" }}
      >
        ⊙
      </button>
      <span
        className="text-center text-[0.65rem] text-[var(--muted)]"
        aria-live="polite"
      >
        {Math.round(scale * 100)}%
      </span>
    </div>
  );
}
