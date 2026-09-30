"use client";

import { useMemo } from "react";
import type { PositionedNode } from "@/lib/dependencies";
import { TRACK_LABELS, type McuTrack } from "@/lib/mcu";
import { TRACK_ROW_ORDER } from "@/lib/layout-solver";
import type { GraphView } from "@/lib/graph-view";

type TrackBand = {
  track: McuTrack;
  minY: number;
  maxY: number;
};

/** Étendue verticale (centres de nœuds) de chaque piste, dans l'ordre des lignes. */
function computeTrackBands(nodes: PositionedNode[]): TrackBand[] {
  const byTrack = new Map<McuTrack, { minY: number; maxY: number }>();
  for (const node of nodes) {
    const band = byTrack.get(node.item.track);
    if (!band) {
      byTrack.set(node.item.track, { minY: node.y, maxY: node.y });
      continue;
    }
    band.minY = Math.min(band.minY, node.y);
    band.maxY = Math.max(band.maxY, node.y);
  }

  return TRACK_ROW_ORDER.flatMap((track) => {
    const band = byTrack.get(track);
    return band ? [{ track, ...band }] : [];
  });
}

type LabelProps = {
  nodes: PositionedNode[];
  view: GraphView;
  containerH: number;
  rowHeight: number;
};

const LABEL_HEIGHT = 20;
const LABEL_INSET = 8;

export function TrackLabels({ nodes, view, containerH, rowHeight }: LabelProps) {
  const labels = useMemo(() => {
    const bands = computeTrackBands(nodes);
    const halfRow = (rowHeight / 2) * view.scale;

    return bands.flatMap((band) => {
      const top = view.ty + band.minY * view.scale - halfRow;
      const bottom = view.ty + band.maxY * view.scale + halfRow;
      if (bottom < 0 || top > containerH) return [];

      // Libellé collant : reste visible tant que la bande est à l'écran
      const minTop = top + LABEL_INSET;
      const maxTop = bottom - LABEL_HEIGHT - LABEL_INSET;
      const stickyTop = Math.min(Math.max(LABEL_INSET, minTop), maxTop);
      if (stickyTop < minTop - 1) return [];

      return [
        {
          track: band.track,
          top: stickyTop,
          label: TRACK_LABELS[band.track],
        },
      ];
    });
  }, [nodes, view.ty, view.scale, containerH, rowHeight]);

  return (
    <div className="track-labels" aria-hidden="true">
      {labels.map((label) => (
        <span
          key={label.track}
          className={`track-labels-item track-labels-item--${label.track}`}
          style={{ top: label.top }}
        >
          {label.label}
        </span>
      ))}
    </div>
  );
}

export function TrackBands({
  nodes,
  width,
  rowHeight,
}: {
  nodes: PositionedNode[];
  width: number;
  rowHeight: number;
}) {
  const bands = useMemo(
    () =>
      computeTrackBands(nodes).map((band, index) => ({
        track: band.track,
        y: band.minY - rowHeight / 2,
        height: band.maxY - band.minY + rowHeight,
        index,
      })),
    [nodes, rowHeight],
  );

  return (
    <g className="track-bands" pointerEvents="none" aria-hidden="true">
      {bands.map((band) => (
        <rect
          key={band.track}
          x={0}
          y={band.y}
          width={width}
          height={band.height}
          className={
            band.index % 2 === 0
              ? "track-band track-band--even"
              : "track-band track-band--odd"
          }
        />
      ))}
    </g>
  );
}
