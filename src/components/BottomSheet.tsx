"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "half" | "full";
  children: ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  title,
  size = "half",
  children,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bottom-sheet-root" role="presentation">
      <button
        type="button"
        className="bottom-sheet-backdrop"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={[
          "bottom-sheet",
          size === "full" ? "bottom-sheet--full" : "bottom-sheet--half",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="bottom-sheet-handle" aria-hidden="true" />
        <div className="bottom-sheet-header">
          <h2 id={titleId} className="bottom-sheet-title">
            {title}
          </h2>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="bottom-sheet-body">{children}</div>
      </div>
    </div>
  );
}
