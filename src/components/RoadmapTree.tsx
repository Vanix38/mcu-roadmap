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
import {
  centerOn,
  clampView,
  DEFAULT_SCALE,
  fitOverview,
  fitScaleForReadableNode,
  type GraphView,
  zoomAt,
} from "@/lib/graph-view";
import { useIsTouch } from "@/lib/use-media-query";
import { EdgeTooltip } from "./EdgeTooltip";
import { GraphControls } from "./GraphControls";
import { GraphMinimap } from "./GraphMinimap";
import { PhaseJumpBar } from "./PhaseJumpBar";
import { RoadmapItem } from "./RoadmapItem";

const TAP_MAX_DIST = 8;
const TAP_MAX_MS = 300;

type Props = {
  allItems: McuItem[];
  visibleItems: McuItem[];
  checked: Set<string>;
  focusId: string | null;
  selectedId?: string | null;
  isMobile?: boolean;
  onToggle: (item: McuItem) => void;
  onSelect?: (item: McuItem) => void;
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
  selectedId = null,
  isMobile = false,
  onToggle,
  onSelect,
}: Props) {
  const isTouch = useIsTouch();
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

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const viewRef = useRef(view);
  const pinchStart = useRef<{
    dist: number;
    midX: number;
    midY: number;
    view: GraphView;
  } | null>(null);
  const panStart = useRef<{ x: number; y: number; view: GraphView } | null>(
    null,
  );
  const tapStart = useRef<{
    x: number;
    y: number;
    t: number;
    nodeId: string | null;
  } | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const highlightSource = hoveredId ?? selectedId;
  const highlightIds = useMemo(
    () => getHighlightIds(allItems, highlightSource),
    [allItems, highlightSource],
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
    if (!hoveredEdge || hoveredId || isTouch) return null;
    const fromTitle = titleById.get(hoveredEdge.from);
    const toTitle = titleById.get(hoveredEdge.to);
    if (!fromTitle || !toTitle) return null;
    const point = pathMidpoint(hoveredEdge.pathD);
    if (!point) return null;
    return { label: `${fromTitle} → ${toTitle}`, ...point };
  }, [hoveredEdge, hoveredId, titleById, isTouch]);

  const phases = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of allItems) {
      if (!seen.has(item.phase)) {
        seen.add(item.phase);
        list.push(item.phase);
      }
    }
    return list;
  }, [allItems]);

  const canvasSize = useMemo(
    () => ({ w: layout.width, h: layout.height }),
    [layout.width, layout.height],
  );

  const applyView = useCallback(
    (next: GraphView) => {
      setView(clampView(next, canvasSize, containerSize));
    },
    [canvasSize, containerSize],
  );

  const findProgressNode = useCallback(() => {
    const available = allItems.find(
      (item) => !checked.has(item.id) && canCheckItem(item, checked),
    );
    if (available) {
      return layout.nodes.find((n) => n.item.id === available.id) ?? null;
    }
    return layout.nodes.find((n) => n.item.id === "iron-man-2008") ?? layout.nodes[0] ?? null;
  }, [allItems, checked, layout.nodes]);

  const resetOverview = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    applyView(
      fitOverview(
        { w: el.clientWidth, h: el.clientHeight },
        canvasSize,
        DEFAULT_SCALE,
      ),
    );
  }, [applyView, canvasSize]);

  const goToProgress = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const node = findProgressNode();
    if (!node) return;
    const scale = isMobile
      ? fitScaleForReadableNode(el.clientWidth)
      : Math.max(view.scale, 0.6);
    applyView(
      centerOn({ w: el.clientWidth, h: el.clientHeight }, node, scale),
    );
  }, [applyView, findProgressNode, isMobile, view.scale]);

  const initView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (isMobile) {
      const node = findProgressNode();
      if (!node) return;
      const scale = fitScaleForReadableNode(el.clientWidth);
      applyView(
        centerOn({ w: el.clientWidth, h: el.clientHeight }, node, scale),
      );
    } else {
      applyView(
        fitOverview(
          { w: el.clientWidth, h: el.clientHeight },
          canvasSize,
          DEFAULT_SCALE,
        ),
      );
    }
  }, [applyView, canvasSize, findProgressNode, isMobile]);

  useEffect(() => {
    initialized.current = false;
  }, [layoutKey, isMobile]);

  useEffect(() => {
    if (initialized.current) return;
    if (containerSize.w < 10) return;
    initView();
    initialized.current = true;
  }, [containerSize, initView]);

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
    const scale = Math.max(view.scale, isMobile ? fitScaleForReadableNode(el.clientWidth) : 0.6);
    applyView(centerOn({ w: el.clientWidth, h: el.clientHeight }, node, scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-center when focusId changes
  }, [focusId]);

  const zoomBy = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      setView((prev) =>
        clampView(zoomAt(prev, { x: cx, y: cy }, factor), canvasSize, {
          w: el.clientWidth,
          h: el.clientHeight,
        }),
      );
    },
    [canvasSize],
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.92 : 1.08;

      setView((prev) =>
        clampView(zoomAt(prev, { x: mx, y: my }, delta), canvasSize, {
          w: el.clientWidth,
          h: el.clientHeight,
        }),
      );
    },
    [canvasSize],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest(
        "button, input, label, .graph-minimap, .minimap-wrap, .phase-jump, .graph-controls",
      )
    ) {
      return;
    }

    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pointers.current.set(e.pointerId, { x, y });
    e.currentTarget.setPointerCapture(e.pointerId);

    const nodeEl = (e.target as HTMLElement).closest(".graph-node");
    const nodeId = nodeEl?.getAttribute("data-node-id") ?? null;
    tapStart.current = { x: e.clientX, y: e.clientY, t: Date.now(), nodeId };

    if (pointers.current.size === 1) {
      setDragging(true);
      panStart.current = { x, y, view: viewRef.current };
      pinchStart.current = null;
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      pinchStart.current = { dist, midX, midY, view: viewRef.current };
      panStart.current = null;
      tapStart.current = null;
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointers.current.set(e.pointerId, { x, y });

    if (pointers.current.size === 2 && pinchStart.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const start = pinchStart.current;
      const factor = dist / Math.max(start.dist, 1);
      let next = zoomAt(start.view, { x: start.midX, y: start.midY }, factor);
      next = {
        ...next,
        tx: next.tx + (midX - start.midX),
        ty: next.ty + (midY - start.midY),
      };
      applyView(next);
      return;
    }

    if (pointers.current.size === 1 && panStart.current) {
      const start = panStart.current;
      applyView({
        ...start.view,
        tx: start.view.tx + (x - start.x),
        ty: start.view.ty + (y - start.y),
      });
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const wasTap = tapStart.current;
    pointers.current.delete(e.pointerId);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.entries()][0];
      if (remaining) {
        panStart.current = {
          x: remaining[1].x,
          y: remaining[1].y,
          view: viewRef.current,
        };
      }
      pinchStart.current = null;
    } else if (pointers.current.size === 0) {
      setDragging(false);
      panStart.current = null;
      pinchStart.current = null;

      if (wasTap && onSelect) {
        const dist = Math.hypot(
          e.clientX - wasTap.x,
          e.clientY - wasTap.y,
        );
        const dt = Date.now() - wasTap.t;
        if (dist < TAP_MAX_DIST && dt < TAP_MAX_MS && wasTap.nodeId) {
          const item = allItems.find((i) => i.id === wasTap.nodeId);
          if (item) onSelect(item);
        }
      }
    }

    tapStart.current = null;
  };

  const navigateTo = (canvasX: number, canvasY: number) => {
    applyView({
      ...view,
      tx: containerSize.w / 2 - canvasX * view.scale,
      ty: containerSize.h / 2 - canvasY * view.scale,
    });
  };

  const jumpToPhase = (phase: string) => {
    const node = layout.nodes
      .filter((n) => n.item.phase === phase && visibleIds.has(n.item.id))
      .sort((a, b) => a.item.order - b.item.order)[0];
    if (!node || !viewportRef.current) return;
    const el = viewportRef.current;
    const scale = Math.max(
      view.scale,
      fitScaleForReadableNode(el.clientWidth),
    );
    applyView(centerOn({ w: el.clientWidth, h: el.clientHeight }, node, scale));
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

  const activePhase = useMemo(() => {
    if (!isMobile || containerSize.w < 10) return null;
    const cx = (-view.tx + containerSize.w / 2) / view.scale;
    const cy = (-view.ty + containerSize.h / 2) / view.scale;
    let best: { phase: string; dist: number } | null = null;
    for (const node of layout.nodes) {
      if (!visibleIds.has(node.item.id)) continue;
      const dist = Math.hypot(node.x - cx, node.y - cy);
      if (!best || dist < best.dist) {
        best = { phase: node.item.phase, dist };
      }
    }
    return best?.phase ?? null;
  }, [view, containerSize, layout.nodes, visibleIds, isMobile]);

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
      className={[
        "graph-viewport",
        dragging ? "graph-viewport--dragging" : "",
        isTouch ? "graph-viewport--touch" : "",
        isMobile ? "has-action-bar" : "",
      ].join(" ")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
            {!isTouch ? (
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
            ) : null}
          </svg>

          {tooltip && (
            <EdgeTooltip label={tooltip.label} x={tooltip.x} y={tooltip.y} />
          )}

          {layout.nodes.map((node) => {
            if (!visibleIds.has(node.item.id)) return null;

            const isChecked = checked.has(node.item.id);
            const disabled = !canCheckItem(node.item, checked);
            const isDimmed =
              highlightIds !== null && !highlightIds.has(node.item.id);
            const isHighlighted =
              highlightIds !== null && highlightIds.has(node.item.id);
            const isFocused = focusId === node.item.id;

            return (
              <div
                key={node.item.id}
                data-node-id={node.item.id}
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
                    if (isTouch) return;
                    setHoveredId(id);
                    if (id) setHoveredEdgeId(null);
                  }}
                  onSelect={() => onSelect?.(node.item)}
                  variant="tree"
                />
              </div>
            );
          })}
        </div>
      </div>

      {isMobile ? (
        <PhaseJumpBar
          phases={phases}
          activePhase={activePhase}
          onJump={jumpToPhase}
        />
      ) : null}

      <GraphControls
        scale={view.scale}
        onZoomIn={() => zoomBy(1.15)}
        onZoomOut={() => zoomBy(0.87)}
        onProgress={goToProgress}
        onOverview={resetOverview}
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
