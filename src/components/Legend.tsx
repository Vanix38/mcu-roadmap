export function Legend() {
  const items = [
    { color: "var(--accent-emerald)", label: "Vu" },
    { color: "var(--foreground)", label: "Disponible" },
    { color: "var(--locked)", label: "Verrouillé" },
    { color: "var(--merge)", label: "Convergence" },
    { color: "var(--accent-gold)", label: "Jalon essentiel", ring: true },
    { color: "var(--accent-gold)", label: "Chemin actif" },
    { color: "var(--edge)", label: "Lien au-dessus", thick: true },
    { color: "var(--edge)", label: "Lien en dessous", faint: true },
    { color: "var(--track-spidey)", label: "Couleur = piste" },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1" role="list" aria-label="Légende">
      {items.map((item) => (
        <div key={item.label} className="legend-item" role="listitem">
          {item.thick ? (
            <span className="legend-line legend-line--over" aria-hidden="true" />
          ) : item.faint ? (
            <span className="legend-line legend-line--under" aria-hidden="true" />
          ) : (
            <span
              className={["legend-dot", item.ring ? "legend-dot--ring" : ""]
                .filter(Boolean)
                .join(" ")}
              style={{ background: item.color }}
              aria-hidden="true"
            />
          )}
          {item.label}
        </div>
      ))}
    </div>
  );
}
