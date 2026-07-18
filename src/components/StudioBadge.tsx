"use client";

import { useState } from "react";
import type { McuStudio } from "@/lib/mcu";
import { STUDIO_BADGE, STUDIO_LABELS } from "@/lib/mcu";
import { getStudioLogoSrc, STUDIO_LOGO_EXTENSIONS } from "@/lib/media";

type Props = {
  studio: McuStudio;
  /** Compact pour la légende */
  compact?: boolean;
  className?: string;
};

export function StudioBadge({ studio, compact = false, className }: Props) {
  const [extIndex, setExtIndex] = useState(0);
  const label = STUDIO_LABELS[studio];
  const hasLogo = extIndex < STUDIO_LOGO_EXTENSIONS.length;

  const shellClass = [
    compact ? "legend-studio" : "node-studio",
    `node-studio--${studio}`,
    hasLogo ? "node-studio--logo" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!hasLogo) {
    return (
      <span className={shellClass} title={label} aria-label={label}>
        {STUDIO_BADGE[studio]}
      </span>
    );
  }

  const extension = STUDIO_LOGO_EXTENSIONS[extIndex];
  const src = getStudioLogoSrc(studio, extension);

  return (
    <span className={shellClass} title={label} aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={compact ? 20 : 24}
        height={compact ? 20 : 24}
        className="node-studio-logo"
        onError={() => setExtIndex((current) => current + 1)}
      />
    </span>
  );
}
