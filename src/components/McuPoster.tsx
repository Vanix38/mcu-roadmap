"use client";

import { useEffect, useState } from "react";
import type { McuItem } from "@/lib/mcu";
import { resolveMcuPosterSrc } from "@/lib/media";

type Props = {
  item: McuItem;
  className?: string;
  milestone?: boolean;
  /** LCP / hero — chargement immédiat */
  priority?: boolean;
  /** `thumb` (défaut) pour listes/graphe ; `full` pour fiche détail */
  quality?: "thumb" | "full";
};

export function McuPoster({
  item,
  className,
  milestone = false,
  priority = false,
  quality = "thumb",
}: Props) {
  const preferred = resolveMcuPosterSrc(item.id, quality);
  const [src, setSrc] = useState<string | null>(preferred);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(resolveMcuPosterSrc(item.id, quality));
    setFailed(false);
  }, [item.id, quality]);

  useEffect(() => {
    if (!priority || !src || typeof document === "undefined") return;
    const existing = document.head.querySelector(
      `link[data-poster-preload="${item.id}"]`,
    );
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    link.dataset.posterPreload = item.id;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [priority, src, item.id]);

  if (!src || failed) {
    return (
      <div
        className={[
          "title-fallback",
          milestone ? "title-fallback--milestone" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {item.title}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.title}
      title={item.title}
      width={160}
      height={240}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      className={[
        "title-img",
        milestone ? "title-img--milestone" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onError={() => {
        if (quality === "thumb") {
          const full = resolveMcuPosterSrc(item.id, "full");
          if (full && full !== src) {
            setSrc(full);
            return;
          }
        }
        setFailed(true);
      }}
    />
  );
}
