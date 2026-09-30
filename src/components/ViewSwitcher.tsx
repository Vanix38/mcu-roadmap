"use client";

import {
  VIEW_MODE_LABELS,
  VIEW_MODES,
  type ViewMode,
} from "@/lib/view-mode";

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
};

export function ViewSwitcher({ value, onChange, className }: Props) {
  return (
    <div
      className={["segmented", className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Mode d'affichage"
    >
      {VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          className={[
            "segmented-btn",
            value === mode ? "segmented-btn--active" : "",
          ].join(" ")}
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
        >
          {VIEW_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
