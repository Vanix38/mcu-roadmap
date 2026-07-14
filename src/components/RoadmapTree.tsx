"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { McuItem } from "@/lib/mcu";
import {
  buildDependencyLayout,
  canCheckItem,
  getHighlightIds,
  LAYOUT_REVISION,
  pathMidpoint,
  type RoutedEdge,
} from "@/lib/dependencies";
import { EdgeTooltip } from "./EdgeTooltip";
import { GraphControls } from "./GraphControls";
import { GraphMinimap } from "./GraphMinimap";
import { RoadmapItem } from "./RoadmapItem";

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const DEFAULT_SCALE = 0.2;

type GraphView = { scale: number; tx: number; ty: number };

type Props = {
  allItems: McuItem[];
  visibleItems: McuItem[];
  checked: Set<string>;
  focusId: string | null;
  onToggle: (item: McuItem) => void;
};

function edgeClassName(
  edge: RoutedEdge,
  checked: Set<string>,
  highlightIds: Set<string> | null,
  hoveredEdgeId: string | null,
  hoveredNodeId: string | null,
) {
  const classes = ["graph-line", `graph-line--${edge.zLayer}`];

  if (hoveredEdgeId && !hoveredNodeId) {
    if (edge.id === hoveredEdgeId) classes.push("graph-line--edge-hover");
    else classes.push("graph-line--dimmed");
    return classes.join(" ");
  }

  const inHighlight =
    highlightIds &&
    highlightIds.has(edge.from) &&
    highlightIds.has(edge.to);

  if (highlightIds) {
    if (inHighlight) classes.push("graph-line--highlight");
    else classes.push("graph-line--dimmed");
    return classes.join(" ");
  }

  if (checked.has(edge.from) && checked.has(edge.to)) {
    classes.push("graph-line--done");
    return classes.join(" ");
  }

  classes.push(`graph-line--track-${edge.track}`);
  return classes.join(" ");
}

function renderEdge(edge: RoutedEdge, className: string) {
  return (
    <path
      key={edge.id}
      d={edge.pathD}
      className={className}
      pointerEvents="none"
    />
  );
}

export function RoadmapTree({
  allItems,
  visibleItems,
  checked,
  focusId,
  onToggle,
}: Props) {
  const layout = useMemo(() => buildDependencyLayout(allItems), [allItems]);
  const layoutKey = useMemo(
    () =>
      `${LAYOUT_REVISION}:${layout.nodes
        .map((n) => `${n.item.id}:${n.x},${n.y}`)
        .join("|")}`,
    [layout],
  );
  const visibleIds = useMemo(
    () => new Set(visibleItems.map((item) => item.id)),
    [visibleItems],
  );
  const titleById = useMemo(
    () => new Map(allItems.map((item) => [item.id, item.title])),
    [allItems],
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<GraphView>({
    scale: DEFAULT_SCALE,
    tx: 0,
    ty: 40,
  });
  const [dragging, setDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const lastPinchDist = useRef<number | null>(null);

  const highlightIds = useMemo(
    () => getHighlightIds(allItems, hoveredId),
    [allItems, hoveredId],
  );

  const visibleEdges = useMemo(
    () =>
      layout.edges.filter(
        (edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to),
      ),
    [layout.edges, visibleIds],
  );

  const underEdges = useMemo(
    () => visibleEdges.filter((e) => e.zLayer === "under"),
    [visibleEdges],
  );
  const overEdges = useMemo(
    () => visibleEdges.filter((e) => e.zLayer === "over"),
    [visibleEdges],
  );

  const hoveredEdge = useMemo(
    () => visibleEdges.find((e) => e.id === hoveredEdgeId) ?? null,
    [visibleEdges, hoveredEdgeId],
  );

  const tooltip = useMemo(() => {
    if (!hoveredEdge || hoveredId) return null;
    const fromTitle = titleById.get(hoveredEdge.from);
    const toTitle = titleById.get(hoveredEdge.to);
    if (!fromTitle || !toTitle) return null;
    const point = pathMidpoint(hoveredEdge.pathD);
    if (!point) return null;
    return { label: `${fromTitle} → ${toTitle}`, ...point };
  }, [hoveredEdge, hoveredId, titleById]);

  const resetView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const fitScale = Math.min(
      (el.clientWidth / layout.width) * 0.95,
      (el.clientHeight / layout.height) * 0.95,
      DEFAULT_SCALE,
    );
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fitScale));
    setView({
      scale,
      tx: (el.clientWidth - layout.width * scale) / 2,
      ty: (el.clientHeight - layout.height * scale) / 2,
    });
  }, [layout.width, layout.height]);

  useEffect(() => {
    resetView();
  }, [layoutKey, resetView]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!focusId || !viewportRef.current) return;
    const node = layout.nodes.find((n) => n.item.id === focusId);
    if (!node) return;

    const el = viewportRef.current;
    setView((prev) => ({
      scale: prev.scale,
      tx: el.clientWidth / 2 - node.x * prev.scale,
      ty: el.clientHeight / 2 - node.y * prev.scale,
    }));
  }, [focusId, layout.nodes]);

  const zoomBy = useCallback((factor: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;

    setView((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        tx: cx - (cx - prev.tx) * ratio,
        ty: cy - (cy - prev.ty) * ratio,
      };
    });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.92 : 1.08;

    setView((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * delta));
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        tx: mx - (mx - prev.tx) * ratio,
        ty: my - (my - prev.ty) * ratio,
      };
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input, label, .graph-minimap")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setView((prev) => ({
      ...prev,
      tx: dragStart.current.tx + (e.clientX - dragStart.current.x),
      ty: dragStart.current.ty + (e.clientY - dragStart.current.y),
    }));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);

      if (lastPinchDist.current !== null) {
        const ratio = dist / lastPinchDist.current;
        setView((prev) => {
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * ratio));
          return { ...prev, scale: newScale };
        });
      }
      lastPinchDist.current = dist;
    }
  }, []);

  const onTouchEnd = () => {
    lastPinchDist.current = null;
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchMove]);

  const navigateTo = (canvasX: number, canvasY: number) => {
    setView((prev) => ({
      ...prev,
      tx: containerSize.w / 2 - canvasX * prev.scale,
      ty: containerSize.h / 2 - canvasY * prev.scale,
    }));
  };

  const viewportRect = useMemo(
    () => ({
      left: -view.tx / view.scale,
      top: -view.ty / view.scale,
      width: containerSize.w / view.scale,
      height: containerSize.h / view.scale,
    }),
    [view, containerSize],
  );

  if (visibleItems.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 text-sm text-[var(--muted)]">
        Aucun film ne correspond aux filtres.
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className={["graph-viewport", dragging ? "graph-viewport--dragging" : ""].join(" ")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      role="application"
      aria-label="Graphe de dépendances MCU"
    >
      <div
        className="graph-stage"
        style={{
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
        }}
      >
        <div
          className="graph-canvas"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            className="graph-lines"
            width={layout.width}
            height={layout.height}
            aria-hidden={!hoveredEdgeId}
          >
            <g className="graph-lines-under">
              {underEdges.map((edge) =>
                renderEdge(
                  edge,
                  edgeClassName(
                    edge,
                    checked,
                    highlightIds,
                    hoveredEdgeId,
                    hoveredId,
                  ),
                ),
              )}
            </g>
            <g className="graph-lines-over">
              {overEdges.map((edge) =>
                renderEdge(
                  edge,
                  edgeClassName(
                    edge,
                    checked,
                    highlightIds,
                    hoveredEdgeId,
                    hoveredId,
                  ),
                ),
              )}
            </g>
            <g className="graph-lines-hitbox">
              {visibleEdges.map((edge) => (
                <path
                  key={`hit-${edge.id}`}
                  d={edge.pathD}
                  className="graph-line graph-line--hitbox"
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  aria-label={`${titleById.get(edge.from) ?? edge.from} vers ${titleById.get(edge.to) ?? edge.to}`}
                />
              ))}
            </g>
          </svg>

          {tooltip && (
            <EdgeTooltip label={tooltip.label} x={tooltip.x} y={tooltip.y} />
          )}

          {layout.nodes.map((node) => {
            if (!visibleIds.has(node.item.id)) return null;

            const isChecked = checked.has(node.item.id);
            const disabled = !canCheckItem(node.item, checked);
            const isDimmed = highlightIds !== null && !highlightIds.has(node.item.id);
            const isHighlighted =
              highlightIds !== null && highlightIds.has(node.item.id);
            const isFocused = focusId === node.item.id;

            return (
              <div
                key={node.item.id}
                className={[
                  "graph-node",
                  isDimmed ? "graph-node--dimmed" : "",
                  isFocused || isHighlighted ? "graph-node--focused" : "",
                ].join(" ")}
                style={{ left: node.x, top: node.y }}
              >
                <RoadmapItem
                  item={node.item}
                  checked={isChecked}
                  disabled={disabled}
                  highlighted={isHighlighted || isFocused}
                  onToggle={() => onToggle(node.item)}
                  onHover={(id) => {
                    setHoveredId(id);
                    if (id) setHoveredEdgeId(null);
                  }}
                  variant="tree"
                />
              </div>
            );
          })}
        </div>
      </div>

      <GraphControls
        scale={view.scale}
        onZoomIn={() => zoomBy(1.15)}
        onZoomOut={() => zoomBy(0.87)}
        onReset={resetView}
      />

      <GraphMinimap
        layout={layout}
        viewport={viewportRect}
        onNavigate={navigateTo}
        hoveredEdgeId={hoveredEdgeId}
      />
    </div>
  );
}
