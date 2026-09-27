"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { scaleRoutedEdgePath, type DependencyLayout } from "@/lib/dependencies";
import { isMilestone, isSpine } from "@/lib/mcu";
import { useIsMobile } from "@/lib/use-media-query";

type Viewport = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Props = {
  layout: DependencyLayout;
  viewport: Viewport;
  onNavigate: (canvasX: number, canvasY: number) => void;
  hoveredEdgeId?: string | null;
};

export function GraphMinimap({
  layout,
  viewport,
  onNavigate,
  hoveredEdgeId = null,
}: Props) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const { width: minimapW, height: minimapH } = useMemo(() => {
    const maxW = isMobile ? 110 : 200;
    const ratio = layout.width / Math.max(layout.height, 1);
    let w = maxW;
    let h = maxW / ratio;
    if (h > maxW * 1.1) {
      h = maxW * 1.1;
      w = h * ratio;
    }
    return { width: Math.round(w), height: Math.round(h) };
  }, [layout.width, layout.height, isMobile]);

  const scaleX = minimapW / layout.width;
  const scaleY = minimapH / layout.height;

  function navigateFromEvent(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * layout.width;
    const y = ((e.clientY - rect.top) / rect.height) * layout.height;
    onNavigate(x, y);
  }

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    navigateFromEvent(e);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    navigateFromEvent(e);
  };

  return (
    <div className="minimap-wrap">
      {isMobile ? (
        <button
          type="button"
          className="minimap-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Afficher la minimap" : "Masquer la minimap"}
        >
          {collapsed ? "▣" : "▢"}
        </button>
      ) : null}

      {!collapsed ? (
        <div className="graph-minimap" aria-label="Minimap">
          <svg
            width={minimapW}
            height={minimapH}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            role="img"
            aria-label="Vue réduite du graphe, glisser pour naviguer"
          >
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={scaleRoutedEdgePath(edge, scaleX, scaleY)}
                stroke={
                  edge.id === hoveredEdgeId
                    ? "var(--accent-gold)"
                    : "var(--edge)"
                }
                strokeWidth={edge.id === hoveredEdgeId ? 2 : 1}
                fill="none"
                opacity={edge.id === hoveredEdgeId ? 1 : 0.5}
              />
            ))}

            {layout.nodes.map((node) => (
              <circle
                key={node.item.id}
                cx={node.x * scaleX}
                cy={node.y * scaleY}
                r={
                  isSpine(node.item.id) || node.item.track === "merge" ? 5 : 2
                }
                fill={
                  isSpine(node.item.id) || node.item.track === "merge"
                    ? "var(--merge)"
                    : isMilestone(node.item.id)
                      ? "var(--accent-gold)"
                      : "var(--muted)"
                }
                stroke={
                  isMilestone(node.item.id) &&
                  !isSpine(node.item.id) &&
                  node.item.track !== "merge"
                    ? "var(--accent-gold)"
                    : undefined
                }
                strokeWidth={
                  isMilestone(node.item.id) &&
                  !isSpine(node.item.id) &&
                  node.item.track !== "merge"
                    ? 1.5
                    : undefined
                }
              />
            ))}

            <rect
              className="minimap-viewport"
              x={viewport.left * scaleX}
              y={viewport.top * scaleY}
              width={viewport.width * scaleX}
              height={viewport.height * scaleY}
              rx={2}
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
