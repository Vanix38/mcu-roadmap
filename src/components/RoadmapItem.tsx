"use client";

import type { KeyboardEvent } from "react";
import type { McuItem } from "@/lib/mcu";
import {
  getContainerKind,
  getSeasonLabel,
  isMilestone,
  isSpine,
  TRACK_EDGE_COLORS,
} from "@/lib/mcu";
import {
  getChainDisplayItem,
  getChainProgress,
  getChainRangeLabel,
  type CollapsedChain,
} from "@/lib/chains";
import type { GraphLod } from "@/lib/graph-lod";
import type { UniverseId, UniversePortal } from "@/lib/universe";
import { useIsTouch } from "@/lib/use-media-query";
import { McuPoster } from "./McuPoster";
import { StudioBadge } from "./StudioBadge";

type Props = {
  item: McuItem;
  checked: boolean;
  disabled: boolean;
  highlighted?: boolean;
  chain?: CollapsedChain | null;
  chainChecked?: Set<string>;
  portals?: UniversePortal[];
  lod?: GraphLod;
  onToggle: () => void;
  onHover?: (id: string | null) => void;
  onSelect?: () => void;
  onPortalNavigate?: (universe: UniverseId, focusId: string) => void;
  variant?: "card" | "tree";
};

function PortalBadge({
  portals,
  onPortalNavigate,
}: {
  portals: UniversePortal[];
  onPortalNavigate?: (universe: UniverseId, focusId: string) => void;
}) {
  if (portals.length === 0) return null;
  const primary = portals[0];
  const extra = portals.length - 1;

  return (
    <button
      type="button"
      className="node-portal"
      aria-label={`Portail vers ${primary.targetUniverse}: ${primary.label}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPortalNavigate?.(primary.targetUniverse, primary.targetId);
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {primary.label}
      {extra > 0 ? <span className="node-portal-extra">+{extra}</span> : null}
    </button>
  );
}

function isChainMilestone(chain: CollapsedChain | null) {
  if (!chain) return false;
  return chain.members.some((m) => isMilestone(m.id));
}

export function RoadmapItem({
  item,
  checked,
  disabled,
  highlighted = false,
  chain = null,
  chainChecked,
  portals = [],
  lod = "mid",
  onToggle,
  onHover,
  onSelect,
  onPortalNavigate,
  variant = "card",
}: Props) {
  const isTouch = useIsTouch();

  if (variant !== "tree") return null;

  const isChain = Boolean(chain);
  const displayItem =
    chain && chainChecked ? getChainDisplayItem(chain, chainChecked) : item;
  const progress = chain && chainChecked ? getChainProgress(chain, chainChecked) : null;
  const rangeLabel = chain ? getChainRangeLabel(chain) : null;

  const isLocked = disabled && !checked;
  const isAvailable = !checked && !disabled;
  const milestone =
    isMilestone(displayItem.id) || isChainMilestone(chain);
  const spine = isSpine(displayItem.id) || displayItem.track === "merge";
  const season = isChain ? null : getSeasonLabel(displayItem);
  const kind = getContainerKind(displayItem);
  const showAsDot = lod === "low" && !milestone;

  const cardClass = [
    "node-card",
    `node-card--${kind}`,
    `node-card--lod-${lod}`,
    isChain ? "node-card--stack" : "",
    showAsDot ? "node-card--dot" : "",
    milestone ? "node-card--milestone" : "",
    spine ? "node-card--spine" : "",
    checked ? "node-card--checked" : "",
    isAvailable ? "node-card--available" : "",
    isLocked ? "node-card--locked" : "",
    displayItem.track === "merge" ? "node-card--merge" : "",
    highlighted ? "node-card--highlight" : "",
  ].join(" ");

  const title = isChain ? chain!.title : item.title;
  const year = displayItem.releaseDate.slice(0, 4);

  const badges = !showAsDot ? (
    <>
      {lod !== "low" ? <span className="node-order">{displayItem.order}</span> : null}
      {lod !== "low" ? <StudioBadge studio={displayItem.studio} /> : null}
      {season && lod !== "low" ? (
        <span className="node-season" aria-label={`Saison ${season.slice(1)}`}>
          {season}
        </span>
      ) : null}
      {isChain && progress && lod !== "low" ? (
        <span className="node-stack-badge" aria-label={`${progress.done} sur ${progress.total}`}>
          {progress.done}/{progress.total}
          {rangeLabel ? ` · ${rangeLabel}` : ""}
        </span>
      ) : null}
      {lod !== "low" ? (
        <PortalBadge portals={portals} onPortalNavigate={onPortalNavigate} />
      ) : null}
      {isLocked && lod !== "low" ? (
        <span className="node-lock" aria-hidden="true">
          🔒
        </span>
      ) : null}
    </>
  ) : null;

  const meta =
    lod === "high" ? (
      <div className="node-meta">
        <p className="node-meta-title">{title}</p>
        <p className="node-meta-sub">
          {year}
          <StudioBadge studio={displayItem.studio} compact />
        </p>
      </div>
    ) : null;

  const body = showAsDot ? (
    <div
      className={[
        "node-dot",
        checked ? "node-dot--checked" : "",
        isAvailable ? "node-dot--available" : "",
        isLocked ? "node-dot--locked" : "",
        isChain ? "node-dot--stack" : "",
      ].join(" ")}
      style={{ background: TRACK_EDGE_COLORS[displayItem.track] }}
      title={title}
    >
      {isChain && progress ? (
        <span className="node-dot-count">{progress.total}</span>
      ) : null}
    </div>
  ) : (
    <div className="relative block">
      <div className={lod === "low" ? "node-poster--lod-low relative" : "relative"}>
        <McuPoster item={displayItem} milestone={milestone} />
        {badges}
      </div>
      {meta}
      <p className="sr-only">{title}</p>
    </div>
  );

  const interactiveProps = {
    onMouseEnter: () => onHover?.(item.id),
    onMouseLeave: () => onHover?.(null),
    onClick: () => onSelect?.(),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.();
      }
    },
  };

  if (showAsDot || isTouch || isChain || lod === "high") {
    return (
      <div
        className={cardClass}
        role="button"
        tabIndex={0}
        aria-label={isChain ? `Détails de la chaîne ${chain!.title}` : `Détails de ${item.title}`}
        {...interactiveProps}
      >
        {body}
        {isLocked && !showAsDot ? (
          <p className="node-hint">
            {item.dependsOn.length > 1
              ? `${item.dependsOn.length} prérequis`
              : "1 prérequis"}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cardClass}
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
        {body}
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
