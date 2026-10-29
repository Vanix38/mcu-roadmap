"use client";

import { useEffect, useState } from "react";
import type { McuStudio } from "@/lib/mcu";
import { STUDIO_BADGE, STUDIO_LABELS } from "@/lib/mcu";
import { resolveStudioLogoSrc } from "@/lib/media";

type Props = {
  studio: McuStudio;
  /** Compact pour la légende */
  compact?: boolean;
  className?: string;
};

export function StudioBadge({ studio, compact = false, className }: Props) {
  const label = STUDIO_LABELS[studio];
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [studio]);
  const src = failed ? null : resolveStudioLogoSrc(studio);
  const hasLogo = Boolean(src);

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

  return (
    <span className={shellClass} title={label} aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src!}
        alt=""
        width={compact ? 20 : 24}
        height={compact ? 20 : 24}
        decoding="async"
        loading="lazy"
        className="node-studio-logo"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
