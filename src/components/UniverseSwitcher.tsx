"use client";

import {
  UNIVERSE_LABELS,
  UNIVERSES,
  type UniverseId,
} from "@/lib/universe";

type Props = {
  value: UniverseId;
  onChange: (universe: UniverseId) => void;
  className?: string;
};

export function UniverseSwitcher({ value, onChange, className }: Props) {
  return (
    <div
      className={["segmented universe-switcher", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label="Univers du graphe"
    >
      {UNIVERSES.map((universe) => (
        <button
          key={universe}
          type="button"
          className={[
            "segmented-btn",
            value === universe ? "segmented-btn--active" : "",
          ].join(" ")}
          onClick={() => onChange(universe)}
          aria-pressed={value === universe}
        >
          {UNIVERSE_LABELS[universe]}
        </button>
      ))}
    </div>
  );
}
