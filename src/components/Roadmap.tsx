"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { McuItem } from "@/lib/mcu";
import { computeProgress, getDescendantIds, canCheckItem } from "@/lib/dependencies";
import {
  clearRoadmapSession,
  readRoadmapSession,
  writeRoadmapSession,
} from "@/lib/storage";
import { Filters } from "./Filters";
import { Legend } from "./Legend";
import { RoadmapTree } from "./RoadmapTree";

type Props = { items: McuItem[] };

export function Roadmap({ items }: Props) {
  const [type, setType] = useState<string>("All");
  const [query, setQuery] = useState<string>("");
  const [headerOpen, setHeaderOpen] = useState(true);

  const [checked, setChecked] = useState<Set<string>>(() => {
    const session = readRoadmapSession();
    return session ? new Set(session.checkedIds) : new Set();
  });
  const [loadedAt, setLoadedAt] = useState<string | null>(() => {
    const session = readRoadmapSession();
    return session?.updatedAt ?? null;
  });
  const firstSaveSkipRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (firstSaveSkipRef.current) {
      firstSaveSkipRef.current = false;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      writeRoadmapSession(Array.from(checked));
      setLoadedAt(new Date().toISOString());
    }, 350);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [checked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (type !== "All" && it.type !== type) return false;
      if (q && !it.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, type, query]);

  const focusId = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const match = filtered.find((it) => it.title.toLowerCase().includes(q));
    return match?.id ?? null;
  }, [query, filtered]);

  const progress = useMemo(() => computeProgress(items, checked), [items, checked]);

  const phaseStats = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const item of items) {
      const stat = map.get(item.phase) ?? { done: 0, total: 0 };
      stat.total += 1;
      if (checked.has(item.id)) stat.done += 1;
      map.set(item.phase, stat);
    }
    return Array.from(map.entries());
  }, [items, checked]);

  function toggle(item: McuItem) {
    setChecked((prev) => {
      const next = new Set(prev);

      if (next.has(item.id)) {
        next.delete(item.id);
        for (const descendantId of getDescendantIds(items, item.id)) {
          next.delete(descendantId);
        }
        return next;
      }

      if (!canCheckItem(item, next)) return next;
      next.add(item.id);
      return next;
    });
  }

  function resetAll() {
    setChecked(new Set());
    clearRoadmapSession();
    setLoadedAt(null);
  }

  return (
    <div className="relative z-[1] flex h-dvh flex-col overflow-hidden">
      <header className="app-header px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/marvel-studios-logo.png"
                alt="Marvel Studios"
                className="header-logo"
              />
              Roadmap
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {progress.done}/{progress.total} films · {progress.pct}%
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="hidden h-9 rounded-lg border border-[var(--edge)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent-gold)] sm:block"
            >
              Tout décocher
            </button>
            <button
              type="button"
              onClick={() => setHeaderOpen((v) => !v)}
              className="graph-btn sm:hidden"
              aria-expanded={headerOpen}
              aria-label={headerOpen ? "Réduire le panneau" : "Ouvrir le panneau"}
            >
              {headerOpen ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {headerOpen ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.pct}%` }}
                role="progressbar"
                aria-valuenow={progress.pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {phaseStats.map(([phase, stat]) => (
                <span key={phase} className="phase-chip">
                  {phase.replace("Phase ", "P")}
                  <strong>
                    {stat.done}/{stat.total}
                  </strong>
                </span>
              ))}
            </div>

            <Filters
              type={type}
              onType={setType}
              query={query}
              onQuery={setQuery}
            />

            <Legend />

            {loadedAt ? (
              <p className="text-[0.65rem] text-[var(--muted)]">
                Session: {new Date(loadedAt).toLocaleString("fr-FR")}
              </p>
            ) : null}

            <button
              onClick={resetAll}
              className="h-9 rounded-lg border border-[var(--edge)] bg-[var(--surface)] px-3 text-xs font-medium sm:hidden"
            >
              Tout décocher
            </button>
          </div>
        ) : null}
      </header>

      <RoadmapTree
        allItems={items}
        visibleItems={filtered}
        checked={checked}
        focusId={focusId}
        onToggle={toggle}
      />
    </div>
  );
}
