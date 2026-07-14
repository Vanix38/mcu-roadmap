import type { MouseEvent } from "react";
import { scaleRoutedEdgePath, type DependencyLayout } from "@/lib/dependencies";
import { isMilestone, isSpine } from "@/lib/mcu";

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

const MINIMAP_W = 200;
const MINIMAP_H = 90;

export function GraphMinimap({
  layout,
  viewport,
  onNavigate,
  hoveredEdgeId = null,
}: Props) {
  const scaleX = MINIMAP_W / layout.width;
  const scaleY = MINIMAP_H / layout.height;

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * layout.width;
    const y = ((e.clientY - rect.top) / rect.height) * layout.height;
    onNavigate(x, y);
  }

  return (
    <div className="graph-minimap" aria-label="Minimap">
      <svg
        width={MINIMAP_W}
        height={MINIMAP_H}
        onClick={handleClick}
        role="img"
        aria-label="Vue réduite du graphe, cliquer pour naviguer"
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
              isSpine(node.item.id) || node.item.track === "merge"
                ? 5
                : 2
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
  );
}
