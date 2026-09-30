"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_UNIVERSE,
  DEFAULT_VIEW_MODE,
  readUniverse,
  readViewMode,
  writeUniverse,
  writeViewMode,
} from "./storage";
import type { UniverseId } from "./universe";
import type { ViewMode } from "./view-mode";

export function usePersistedPrefs() {
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [universe, setUniverse] = useState<UniverseId>(DEFAULT_UNIVERSE);
  const viewModeReadyRef = useRef(false);
  const universeReadyRef = useRef(false);

  useEffect(() => {
    const stored = readViewMode();
    if (stored) setViewMode(stored);
    viewModeReadyRef.current = true;
  }, []);

  useEffect(() => {
    const stored = readUniverse();
    if (stored) setUniverse(stored);
    universeReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!viewModeReadyRef.current) return;
    writeViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!universeReadyRef.current) return;
    writeUniverse(universe);
  }, [universe]);

  return { viewMode, setViewMode, universe, setUniverse };
}
