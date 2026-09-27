"use client";

import { useEffect, useMemo, useRef } from "react";
import type { McuItem } from "@/lib/mcu";
import { getContainerKind, getSeasonLabel } from "@/lib/mcu";
import { canCheckItem } from "@/lib/dependencies";
import { McuPoster } from "./McuPoster";
import { StudioBadge } from "./StudioBadge";

type Props = {
  items: McuItem[];
  allItems: McuItem[];
  checked: Set<string>;
  focusId: string | null;
  onToggle: (item: McuItem) => void;
  onSelect: (item: McuItem) => void;
  onResetFilters?: () => void;
};

type PhaseGroup = {
  phase: string;
  items: McuItem[];
  done: number;
  total: number;
};

function groupByPhase(items: McuItem[], checked: Set<string>): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  const indexByPhase = new Map<string, number>();

  for (const item of items) {
    let idx = indexByPhase.get(item.phase);
    if (idx === undefined) {
      idx = groups.length;
      indexByPhase.set(item.phase, idx);
      groups.push({ phase: item.phase, items: [], done: 0, total: 0 });
    }
    const group = groups[idx];
    group.items.push(item);
    group.total += 1;
    if (checked.has(item.id)) group.done += 1;
  }

  return groups;
}

export function RoadmapList({
  items,
  allItems,
  checked,
  focusId,
  onToggle,
  onSelect,
  onResetFilters,
}: Props) {
  const titleById = useMemo(
    () => new Map(allItems.map((item) => [item.id, item.title])),
    [allItems],
  );
  const groups = useMemo(() => groupByPhase(items, checked), [items, checked]);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!focusId) return;
    const el = itemRefs.current.get(focusId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("list-item--flash");
    const timer = window.setTimeout(() => {
      el.classList.remove("list-item--flash");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [focusId]);

  const scrollToItem = (id: string) => {
    const el = itemRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("list-item--flash");
      window.setTimeout(() => el.classList.remove("list-item--flash"), 1500);
      return;
    }
    const target = allItems.find((i) => i.id === id);
    if (target) onSelect(target);
  };

  if (items.length === 0) {
    return (
      <div className="list-empty">
        <p>Aucun film ne correspond aux filtres.</p>
        {onResetFilters ? (
          <button type="button" className="detail-btn" onClick={onResetFilters}>
            Réinitialiser les filtres
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="list-scroll" role="list" aria-label="Liste MCU">
      {groups.map((group) => (
        <section key={group.phase} aria-labelledby={`phase-${group.phase}`}>
          <header className="list-phase">
            <h2 id={`phase-${group.phase}`} className="list-phase-title">
              {group.phase}
            </h2>
            <div className="list-phase-meta">
              <span>
                {group.done}/{group.total}
              </span>
              <div className="list-phase-bar" aria-hidden="true">
                <div
                  className="list-phase-fill"
                  style={{
                    width: `${group.total ? (group.done / group.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </header>

          {group.items.map((item) => {
            const isChecked = checked.has(item.id);
            const locked = !isChecked && !canCheckItem(item, checked);
            const season = getSeasonLabel(item);
            const kind = getContainerKind(item);
            const year = item.releaseDate.slice(0, 4);
            const missingPrereqs = locked
              ? item.dependsOn.filter((id) => !checked.has(id))
              : [];

            return (
              <div
                key={item.id}
                role="listitem"
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                className={[
                  "list-row",
                  isChecked ? "list-item--checked" : "",
                  locked ? "list-item--locked" : "",
                ].join(" ")}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid rgba(42, 58, 92, 0.45)",
                  borderLeftWidth: 3,
                  borderLeftStyle: kind === "anim" ? "dashed" : "solid",
                  borderLeftColor:
                    kind === "anim"
                      ? "color-mix(in srgb, var(--muted) 65%, var(--accent-gold))"
                      : isChecked
                        ? "var(--accent-emerald)"
                        : "var(--edge)",
                }}
              >
                <button
                  type="button"
                  className="list-item"
                  style={{
                    flex: 1,
                    padding: 0,
                    border: "none",
                    borderBottom: "none",
                    minWidth: 0,
                    background: "transparent",
                  }}
                  onClick={() => onSelect(item)}
                  aria-label={`Détails de ${item.title}`}
                >
                  <div className="list-poster">
                    <McuPoster item={item} />
                  </div>
                  <div className="list-body">
                    <p className="list-title">{item.title}</p>
                    <div className="list-meta">
                      <span>{year}</span>
                      <StudioBadge studio={item.studio} compact />
                      {season ? <span>{season}</span> : null}
                      {locked ? <span aria-hidden="true">🔒</span> : null}
                    </div>
                    {missingPrereqs.length > 0 ? (
                      <div className="list-prereqs">
                        <span className="text-[0.65rem] text-[var(--muted)]">
                          Prérequis :
                        </span>
                        {missingPrereqs.map((id) => (
                          <span
                            key={id}
                            role="button"
                            tabIndex={0}
                            className="list-prereq-chip"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToItem(id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                scrollToItem(id);
                              }
                            }}
                          >
                            {titleById.get(id) ?? id}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>

                <button
                  type="button"
                  className={[
                    "list-check",
                    isChecked ? "list-check--done" : "",
                  ].join(" ")}
                  disabled={locked}
                  onClick={() => onToggle(item)}
                  aria-label={
                    isChecked
                      ? `Retirer ${item.title}`
                      : `Marquer ${item.title} comme vu`
                  }
                  aria-pressed={isChecked}
                >
                  {isChecked ? "✓" : locked ? "🔒" : ""}
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
