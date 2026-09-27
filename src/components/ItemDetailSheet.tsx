"use client";

import { useMemo } from "react";
import type { McuItem } from "@/lib/mcu";
import { STUDIO_LABELS, TRACK_LABELS } from "@/lib/mcu";
import { canCheckItem, getDescendantIds } from "@/lib/dependencies";
import { BottomSheet } from "./BottomSheet";
import { McuPoster } from "./McuPoster";

type ViewMode = "list" | "graph";

type Props = {
  item: McuItem | null;
  allItems: McuItem[];
  checked: Set<string>;
  viewMode: ViewMode;
  isMobile: boolean;
  onClose: () => void;
  onToggle: (item: McuItem) => void;
  onSelect: (item: McuItem) => void;
  onSwitchView: (mode: ViewMode, focusId: string) => void;
};

export function ItemDetailSheet({
  item,
  allItems,
  checked,
  viewMode,
  isMobile,
  onClose,
  onToggle,
  onSelect,
  onSwitchView,
}: Props) {
  const byId = useMemo(
    () => new Map(allItems.map((i) => [i.id, i])),
    [allItems],
  );

  const unlocks = useMemo(() => {
    if (!item) return [];
    return allItems.filter((i) => i.dependsOn.includes(item.id));
  }, [allItems, item]);

  const descendantCount = useMemo(() => {
    if (!item || !checked.has(item.id)) return 0;
    return getDescendantIds(allItems, item.id).size;
  }, [allItems, item, checked]);

  if (!item) return null;

  const isChecked = checked.has(item.id);
  const locked = !isChecked && !canCheckItem(item, checked);
  const dateLabel = new Date(item.releaseDate + "T12:00:00").toLocaleDateString(
    "fr-FR",
    { year: "numeric", month: "long", day: "numeric" },
  );

  let toggleLabel = "Marquer comme vu";
  if (isChecked) {
    toggleLabel =
      descendantCount > 0
        ? `Retirer (+${descendantCount} dépendants)`
        : "Retirer";
  }

  return (
    <BottomSheet open={Boolean(item)} onClose={onClose} title="Détail" size="half">
      <div className="detail-hero">
        <div className="detail-poster">
          <McuPoster item={item} />
        </div>
        <div className="detail-info">
          <h3 className="detail-title">{item.title}</h3>
          <p className="detail-meta">
            {dateLabel}
            <br />
            {item.phase} · {TRACK_LABELS[item.track]}
            <br />
            {STUDIO_LABELS[item.studio]}
            {item.runtimeMin ? ` · ${item.runtimeMin} min` : ""}
          </p>
        </div>
      </div>

      {item.dependsOn.length > 0 ? (
        <section className="detail-section">
          <h4 className="detail-section-title">Prérequis</h4>
          {item.dependsOn.map((id) => {
            const dep = byId.get(id);
            if (!dep) return null;
            const done = checked.has(id);
            return (
              <button
                key={id}
                type="button"
                className="detail-link"
                onClick={() => onSelect(dep)}
              >
                <span
                  className={["detail-dot", done ? "detail-dot--done" : ""].join(
                    " ",
                  )}
                  aria-hidden="true"
                />
                {dep.title}
              </button>
            );
          })}
        </section>
      ) : null}

      {unlocks.length > 0 ? (
        <section className="detail-section">
          <h4 className="detail-section-title">Débloque</h4>
          {unlocks.map((child) => (
            <button
              key={child.id}
              type="button"
              className="detail-link"
              onClick={() => onSelect(child)}
            >
              <span
                className={[
                  "detail-dot",
                  checked.has(child.id) ? "detail-dot--done" : "",
                ].join(" ")}
                aria-hidden="true"
              />
              {child.title}
            </button>
          ))}
        </section>
      ) : null}

      <div className="detail-actions">
        <button
          type="button"
          className="detail-btn detail-btn--primary"
          disabled={locked}
          onClick={() => onToggle(item)}
        >
          {toggleLabel}
        </button>
        {locked ? (
          <p className="detail-hint">
            Vérifiez d&apos;abord les prérequis pour débloquer cet élément.
          </p>
        ) : null}

        {isMobile ? (
          <button
            type="button"
            className="detail-btn"
            onClick={() => {
              const next = viewMode === "list" ? "graph" : "list";
              onSwitchView(next, item.id);
              onClose();
            }}
          >
            {viewMode === "list" ? "Voir dans le graphe" : "Voir dans la liste"}
          </button>
        ) : null}
      </div>
    </BottomSheet>
  );
}
