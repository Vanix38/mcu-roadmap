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
  edgePathBetween,
  getHighlightIds,
  getNodeDimensions,
  type DependencyLayout,
} from "@/lib/dependencies";
import { GraphControls } from "./GraphControls";
import { GraphMinimap } from "./GraphMinimap";
import { RoadmapItem } from "./RoadmapItem";

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const DEFAULT_SCALE = 0.55;

type GraphView = { scale: number; tx: number; ty: number };

type Props = {
  items: McuItem[];
  checked: Set<string>;
  focusId: string | null;
  onToggle: (item: McuItem) => void;
};

function edgePath(layout: DependencyLayout, fromId: string, toId: string) {
  const from = layout.nodes.find((node) => node.item.id === fromId);
  const to = layout.nodes.find((node) => node.item.id === toId);
  if (!from || !to) return "";

  const fromSize = getNodeDimensions(from.item);
  const toSize = getNodeDimensions(to.item);

  return edgePathBetween(from.x, from.y, fromSize.height, to.x, to.y, toSize.height);
}

function edgeClassName(
  edge: { from: string; to: string },
  checked: Set<string>,
  highlightIds: Set<string> | null,
) {
  const inHighlight =
    highlightIds &&
    highlightIds.has(edge.from) &&
    highlightIds.has(edge.to);

  if (highlightIds) {
    if (inHighlight) return "graph-line graph-line--highlight";
    return "graph-line graph-line--dimmed";
  }

  if (checked.has(edge.from) && checked.has(edge.to)) {
    return "graph-line graph-line--done";
  }

  return "graph-line";
}

export function RoadmapTree({ items, checked, focusId, onToggle }: Props) {
  const layout = useMemo(() => buildDependencyLayout(items), [items]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<GraphView>({
    scale: DEFAULT_SCALE,
    tx: 0,
    ty: 40,
  });
  const [dragging, setDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const lastPinchDist = useRef<number | null>(null);

  const highlightIds = useMemo(
    () => getHighlightIds(items, hoveredId),
    [items, hoveredId],
  );

  const resetView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const scale = DEFAULT_SCALE;
    setView({
      scale,
      tx: (el.clientWidth - layout.width * scale) / 2,
      ty: 40,
    });
  }, [layout.width]);

  useEffect(() => {
    resetView();
  }, [layout.width, layout.height, resetView]);

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

  if (items.length === 0) {
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
            aria-hidden="true"
          >
            {layout.edges.map((edge) => (
              <path
                key={`${edge.from}-${edge.to}`}
                d={edgePath(layout, edge.from, edge.to)}
                className={edgeClassName(edge, checked, highlightIds)}
              />
            ))}
          </svg>

          {layout.nodes.map((node) => {
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
                  onHover={setHoveredId}
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
      />
    </div>
  );
}
