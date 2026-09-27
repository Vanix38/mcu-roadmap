"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(query: string) {
  return window.matchMedia(query).matches;
}

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => getSnapshot(query),
    getServerSnapshot,
  );
}

/** Mobile layout breakpoint: max-width 767px */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

/** Touch / coarse pointer (no hover) */
export function useIsTouch() {
  return useMediaQuery("(hover: none)");
}
