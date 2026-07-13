import type { MouseEvent } from "react";
import { getNodeDimensions, type DependencyLayout } from "@/lib/dependencies";
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
};

const MINIMAP_W = 160;
const MINIMAP_H = 110;

function edgePathMini(
  layout: DependencyLayout,
  fromId: string,
  toId: string,
  scaleX: number,
  scaleY: number,
) {
  const from = layout.nodes.find((n) => n.item.id === fromId);
  const to = layout.nodes.find((n) => n.item.id === toId);
  if (!from || !to) return "";

  const fromSize = getNodeDimensions(from.item);
  const toSize = getNodeDimensions(to.item);
  const startX = from.x * scaleX;
  const startY = (from.y + fromSize.height / 2) * scaleY;
  const endX = to.x * scaleX;
  const endY = (to.y - toSize.height / 2) * scaleY;

  if (Math.abs(from.x - to.x) < 8) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const routeY = startY + (endY - startY) * 0.55;
  return `M ${startX} ${startY} L ${startX} ${routeY} L ${endX} ${routeY} L ${endX} ${endY}`;
}

export function GraphMinimap({ layout, viewport, onNavigate }: Props) {
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
            key={`${edge.from}-${edge.to}`}
            d={edgePathMini(layout, edge.from, edge.to, scaleX, scaleY)}
            stroke="var(--edge)"
            strokeWidth={1}
            fill="none"
            opacity={0.5}
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
                : isMilestone(node.item.id)
                  ? 4
                  : 2
            }
            fill={
              isSpine(node.item.id) || node.item.track === "merge"
                ? "var(--merge)"
                : isMilestone(node.item.id)
                  ? "var(--accent-gold)"
                  : "var(--muted)"
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
