"use client";

import { useState } from "react";
import type { McuItem } from "@/lib/mcu";
import { getMcuPosterSrc, MCU_POSTER_EXTENSIONS } from "@/lib/media";

type Props = {
  item: McuItem;
  className?: string;
  milestone?: boolean;
};

export function McuPoster({ item, className, milestone = false }: Props) {
  const [extIndex, setExtIndex] = useState(0);
  const hasPoster = extIndex < MCU_POSTER_EXTENSIONS.length;

  if (!hasPoster) {
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

  const extension = MCU_POSTER_EXTENSIONS[extIndex];
  const src = getMcuPosterSrc(item.id, extension);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.title}
      title={item.title}
      className={[
        "title-img",
        milestone ? "title-img--milestone" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onError={() => setExtIndex((current) => current + 1)}
    />
  );
}
