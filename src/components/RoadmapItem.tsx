import type { McuItem } from "@/lib/mcu";
import { getContainerKind, getSeasonLabel, isMilestone, isSpine } from "@/lib/mcu";
import { McuPoster } from "./McuPoster";
import { StudioBadge } from "./StudioBadge";

type Props = {
  item: McuItem;
  checked: boolean;
  disabled: boolean;
  highlighted?: boolean;
  onToggle: () => void;
  onHover?: (id: string | null) => void;
  variant?: "card" | "tree";
};

export function RoadmapItem({
  item,
  checked,
  disabled,
  highlighted = false,
  onToggle,
  onHover,
  variant = "card",
}: Props) {
  if (variant === "tree") {
    const isLocked = disabled && !checked;
    const isAvailable = !checked && !disabled;
    const milestone = isMilestone(item.id);
    const spine = isSpine(item.id) || item.track === "merge";
    const season = getSeasonLabel(item);
    const kind = getContainerKind(item);

    return (
      <div
        className={[
          "node-card",
          `node-card--${kind}`,
          milestone ? "node-card--milestone" : "",
          spine ? "node-card--spine" : "",
          checked ? "node-card--checked" : "",
          isAvailable ? "node-card--available" : "",
          isLocked ? "node-card--locked" : "",
          item.track === "merge" ? "node-card--merge" : "",
          highlighted ? "node-card--highlight" : "",
        ].join(" ")}
        onMouseEnter={() => onHover?.(item.id)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(item.id)}
        onBlur={() => onHover?.(null)}
      >
        <label className="relative block cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            disabled={isLocked}
            onChange={onToggle}
            className="node-check"
            aria-label={`Marquer ${item.title} comme vu`}
          />

          <div className="relative">
            <McuPoster item={item} milestone={milestone} />
            <span className="node-order">{item.order}</span>
            <StudioBadge studio={item.studio} />
            {season ? (
              <span className="node-season" aria-label={`Saison ${season.slice(1)}`}>
                {season}
              </span>
            ) : null}
            {isLocked ? (
              <span className="node-lock" aria-hidden="true">
                🔒
              </span>
            ) : null}
          </div>

          <p className="sr-only">{item.title}</p>
        </label>

        {isLocked ? (
          <p className="node-hint">
            {item.dependsOn.length > 1
              ? `${item.dependsOn.length} prérequis`
              : "1 prérequis"}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
