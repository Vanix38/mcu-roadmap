"use client";

import dynamic from "next/dynamic";
import type { McuItem } from "@/lib/mcu";

const Roadmap = dynamic(
  () => import("@/components/Roadmap").then((mod) => mod.Roadmap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center text-sm text-[var(--muted)]">
        Chargement de la roadmap…
      </div>
    ),
  },
);

type Props = { items: McuItem[] };

export function RoadmapLoader({ items }: Props) {
  return <Roadmap items={items} />;
}
