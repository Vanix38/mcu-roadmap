"use client";

import { useMemo } from "react";
import type { PositionedNode } from "@/lib/dependencies";
import { gridX } from "@/lib/grid-layout";
import type { GraphView } from "@/lib/graph-view";

type Props = {
  nodes: PositionedNode[];
  view: GraphView;
  containerW: number;
};

function medianYear(years: number[]) {
  if (years.length === 0) return null;
  const sorted = [...years].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function TimelineAxis({ nodes, view, containerW }: Props) {
  const labels = useMemo(() => {
    const byCol = new Map<number, number[]>();
    for (const node of nodes) {
      const year = Number(node.item.releaseDate.slice(0, 4));
      if (!Number.isFinite(year)) continue;
      const list = byCol.get(node.column);
      if (list) list.push(year);
      else byCol.set(node.column, [year]);
    }

    const raw = [...byCol.entries()]
      .map(([col, years]) => {
        const year = medianYear(years);
        if (year === null) return null;
        const x = view.tx + gridX(col) * view.scale;
        return { col, year, x };
      })
      .filter((v): v is { col: number; year: number; x: number } => Boolean(v))
      .sort((a, b) => a.x - b.x);

    const filtered: typeof raw = [];
    let lastX = -Infinity;
    for (const label of raw) {
      if (label.x < -40 || label.x > containerW + 40) continue;
      if (label.x - lastX < 40) continue;
      filtered.push(label);
      lastX = label.x;
    }
    return filtered;
  }, [nodes, view.tx, view.scale, containerW]);

  return (
    <div className="timeline-axis" aria-hidden="true">
      {labels.map((label) => (
        <span
          key={label.col}
          className="timeline-axis-label"
          style={{ left: label.x }}
        >
          {label.year}
        </span>
      ))}
    </div>
  );
}
