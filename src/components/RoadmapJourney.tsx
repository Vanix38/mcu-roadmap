"use client";

import { useEffect, useMemo, useRef } from "react";
import type { McuItem } from "@/lib/mcu";
import { STUDIO_LABELS, getSeasonLabel } from "@/lib/mcu";
import { buildJourney } from "@/lib/journey";
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

function JourneyCard({
  item,
  unlocks,
  soonMissing,
  onToggle,
  onSelect,
}: {
  item: McuItem;
  unlocks: McuItem[];
  soonMissing?: McuItem[];
  onToggle: (item: McuItem) => void;
  onSelect: (item: McuItem) => void;
}) {
  const year = item.releaseDate.slice(0, 4);
  const season = getSeasonLabel(item);
  const isSoon = Boolean(soonMissing?.length);

  return (
    <article
      className={["journey-card", isSoon ? "journey-card--soon" : ""].join(" ")}
    >
      <button
        type="button"
        className="journey-card-media"
        onClick={() => onSelect(item)}
        aria-label={`Détails de ${item.title}`}
      >
        <McuPoster item={item} />
      </button>
      <div className="journey-card-body">
        <button
          type="button"
          className="journey-card-title"
          onClick={() => onSelect(item)}
        >
          {item.title}
        </button>
        <div className="journey-card-meta">
          <span>{year}</span>
          <StudioBadge studio={item.studio} compact />
          {season ? <span>{season}</span> : null}
        </div>
        {isSoon && soonMissing ? (
          <div className="journey-card-missing">
            <span className="text-[0.65rem] text-[var(--muted)]">Manque :</span>
            {soonMissing.map((dep) => (
              <button
                key={dep.id}
                type="button"
                className="journey-chip"
                onClick={() => onSelect(dep)}
              >
                {dep.title}
              </button>
            ))}
          </div>
        ) : unlocks.length > 0 ? (
          <p className="journey-card-unlocks">
            Débloque {unlocks.length}
          </p>
        ) : null}
        {!isSoon ? (
          <button
            type="button"
            className="journey-card-btn"
            onClick={() => onToggle(item)}
            aria-label={`Marquer ${item.title} comme vu`}
          >
            Vu
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function RoadmapJourney({
  items,
  allItems,
  checked,
  focusId,
  onToggle,
  onSelect,
  onResetFilters,
}: Props) {
  const journey = useMemo(() => buildJourney(items, checked), [items, checked]);
  const unlocksFromAll = useMemo(() => {
    const map = new Map<string, McuItem[]>();
    for (const item of allItems) {
      for (const depId of item.dependsOn) {
        const list = map.get(depId);
        if (list) list.push(item);
        else map.set(depId, [item]);
      }
    }
    return map;
  }, [allItems]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!focusId) return;
    const el = itemRefs.current.get(focusId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("journey-flash");
    const timer = window.setTimeout(() => el.classList.remove("journey-flash"), 1500);
    return () => window.clearTimeout(timer);
  }, [focusId]);

  const setItemRef = (id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  const allDone =
    checked.size > 0 &&
    items.length > 0 &&
    items.every((item) => checked.has(item.id));

  const nothingAvailable =
    !journey.next &&
    journey.available.length === 0 &&
    journey.soon.length === 0 &&
    !allDone;

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

  if (allDone) {
    return (
      <div className="list-empty journey-scroll">
        <p>Parcours terminé — {journey.done.length} titres vus.</p>
        <p className="text-sm text-[var(--muted)]">
          Explorez le graphe ou la liste pour revisiter le catalogue.
        </p>
      </div>
    );
  }

  const nextUnlocks = journey.next
    ? unlocksFromAll.get(journey.next.id) ?? []
    : [];

  return (
    <div className="journey-scroll" ref={scrollRef}>
      {journey.next ? (
        <section
          className="journey-hero"
          ref={(el) => setItemRef(journey.next!.id, el)}
          aria-labelledby="journey-next-title"
        >
          <p className="journey-hero-label">Prochain à voir</p>
          <div className="journey-hero-content">
            <button
              type="button"
              className="journey-hero-poster"
              onClick={() => onSelect(journey.next!)}
              aria-label={`Détails de ${journey.next.title}`}
            >
              <McuPoster item={journey.next} />
            </button>
            <div className="journey-hero-info">
              <h2 id="journey-next-title" className="journey-hero-title">
                {journey.next.title}
              </h2>
              <p className="journey-hero-meta">
                {journey.next.releaseDate.slice(0, 4)} ·{" "}
                {STUDIO_LABELS[journey.next.studio]} · {journey.next.phase}
              </p>
              {nextUnlocks.length > 0 ? (
                <div className="journey-unlocks">
                  <span className="text-xs text-[var(--muted)]">Débloque :</span>
                  {nextUnlocks.slice(0, 6).map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className="journey-chip"
                      onClick={() => onSelect(child)}
                    >
                      {child.title}
                    </button>
                  ))}
                  {nextUnlocks.length > 6 ? (
                    <span className="text-xs text-[var(--muted)]">
                      +{nextUnlocks.length - 6}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                className="detail-btn detail-btn--primary journey-hero-btn"
                onClick={() => onToggle(journey.next!)}
              >
                Marquer comme vu
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {nothingAvailable ? (
        <div className="list-empty">
          <p>Rien de disponible avec ces filtres.</p>
          {onResetFilters ? (
            <button type="button" className="detail-btn" onClick={onResetFilters}>
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      ) : null}

      {journey.available.length > 0 ? (
        <section className="journey-section" aria-labelledby="journey-available">
          <h3 id="journey-available" className="journey-section-title">
            À regarder maintenant
            <span className="journey-section-count">{journey.available.length}</span>
          </h3>
          <div className="journey-grid">
            {journey.available.map((item) => (
              <div key={item.id} ref={(el) => setItemRef(item.id, el)}>
                <JourneyCard
                  item={item}
                  unlocks={unlocksFromAll.get(item.id) ?? []}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {journey.soon.length > 0 ? (
        <section className="journey-section" aria-labelledby="journey-soon">
          <h3 id="journey-soon" className="journey-section-title">
            Bientôt débloqué
            <span className="journey-section-count">{journey.soon.length}</span>
          </h3>
          <div className="journey-grid">
            {journey.soon.map(({ item, missing }) => (
              <div key={item.id} ref={(el) => setItemRef(item.id, el)}>
                <JourneyCard
                  item={item}
                  unlocks={[]}
                  soonMissing={missing}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {journey.done.length > 0 ? (
        <section className="journey-section">
          <details className="journey-done">
            <summary className="journey-section-title journey-done-summary">
              Vus
              <span className="journey-section-count">{journey.done.length}</span>
            </summary>
            <ul className="journey-done-list">
              {journey.done.map((item) => (
                <li
                  key={item.id}
                  ref={(el) => setItemRef(item.id, el)}
                  className="journey-done-row"
                >
                  <button
                    type="button"
                    className="journey-done-item"
                    onClick={() => onSelect(item)}
                  >
                    <div className="list-poster">
                      <McuPoster item={item} />
                    </div>
                    <span className="list-title">{item.title}</span>
                    <span className="list-meta">{item.releaseDate.slice(0, 4)}</span>
                  </button>
                  <button
                    type="button"
                    className="journey-card-btn journey-card-btn--ghost"
                    onClick={() => onToggle(item)}
                    aria-label={`Retirer ${item.title}`}
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}
    </div>
  );
}
