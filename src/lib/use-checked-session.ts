"use client";

import { useEffect, useRef, useState } from "react";
import type { McuItem } from "./mcu";
import { canCheckItem, getDescendantIds } from "./dependency-graph";
import {
  clearRoadmapSession,
  readRoadmapSession,
  writeRoadmapSession,
} from "./storage";

export function useCheckedSession(items: readonly McuItem[]) {
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
    if (!window.confirm("Tout décocher et effacer la session ?")) return;
    setChecked(new Set());
    clearRoadmapSession();
    setLoadedAt(null);
  }

  return { checked, loadedAt, toggle, resetAll };
}
