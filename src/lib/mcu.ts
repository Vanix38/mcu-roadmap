import { z } from "zod";

export const MCU_TRACKS = [
  "iron",
  "hulk",
  "thor",
  "cap",
  "falcon",
  "guardians",
  "magic",
  "mystic",
  "loki",
  "animation",
  "antman",
  "spidey",
  "raimi",
  "amazing",
  "venom",
  "spider-misc",
  "spiderverse",
  "wakanda",
  "cosmic",
  "xmen",
  "wolverine",
  "deadpool",
  "fantastic",
  "shield",
  "agent-carter",
  "street",
  "young-heroes",
  "series-misc",
  "misc",
  "merge",
] as const;

export type McuTrack = (typeof MCU_TRACKS)[number];

/** Couleurs des arêtes par piste (CSS var) */
export const TRACK_EDGE_COLORS: Record<McuTrack, string> = {
  iron: "var(--track-iron)",
  hulk: "var(--track-hulk)",
  thor: "var(--track-thor)",
  cap: "var(--track-cap)",
  falcon: "var(--track-falcon)",
  guardians: "var(--track-guardians)",
  magic: "var(--track-magic)",
  mystic: "var(--track-mystic)",
  loki: "var(--track-loki)",
  animation: "var(--track-animation)",
  antman: "var(--track-antman)",
  spidey: "var(--track-spidey)",
  raimi: "var(--track-raimi)",
  amazing: "var(--track-amazing)",
  venom: "var(--track-venom)",
  "spider-misc": "var(--track-spider-misc)",
  spiderverse: "var(--track-spiderverse)",
  wakanda: "var(--track-wakanda)",
  cosmic: "var(--track-cosmic)",
  xmen: "var(--track-xmen)",
  wolverine: "var(--track-wolverine)",
  deadpool: "var(--track-deadpool)",
  fantastic: "var(--track-fantastic)",
  shield: "var(--track-shield)",
  "agent-carter": "var(--track-agent-carter)",
  street: "var(--track-street)",
  "young-heroes": "var(--track-young-heroes)",
  "series-misc": "var(--track-series-misc)",
  misc: "var(--track-misc)",
  merge: "var(--track-merge)",
};

export const TRACK_LABELS: Record<McuTrack, string> = {
  iron: "Iron Man",
  hulk: "Hulk",
  thor: "Thor",
  cap: "Captain America",
  falcon: "Falcon",
  guardians: "Gardiens",
  magic: "Magie",
  mystic: "Mystique",
  loki: "Loki",
  animation: "Animation",
  antman: "Ant-Man",
  spidey: "Spider-Man MCU",
  raimi: "Spider-Man Raimi",
  amazing: "The Amazing",
  venom: "Venom",
  "spider-misc": "Spider divers",
  spiderverse: "Spider-Verse",
  wakanda: "Wakanda",
  cosmic: "Cosmique",
  xmen: "X-Men",
  wolverine: "Wolverine",
  deadpool: "Deadpool",
  fantastic: "4 Fantastiques",
  shield: "S.H.I.E.L.D.",
  "agent-carter": "Agent Carter",
  street: "Street level",
  "young-heroes": "Jeunes héros",
  "series-misc": "Séries divers",
  misc: "Divers",
  merge: "Convergence",
};

export const MCU_STUDIOS = [
  "marvel",
  "fox",
  "sony",
  "sony-animation",
  "netflix",
  "abc",
  "freeform",
  "hulu",
] as const;

export type McuStudio = (typeof MCU_STUDIOS)[number];

/** Abréviation pastille */
export const STUDIO_BADGE: Record<McuStudio, string> = {
  marvel: "MS",
  fox: "FOX",
  sony: "SNY",
  "sony-animation": "ANI",
  netflix: "NFX",
  abc: "ABC",
  freeform: "FRM",
  hulu: "HLU",
};

export const STUDIO_LABELS: Record<McuStudio, string> = {
  marvel: "Marvel Studios",
  fox: "20th Century Fox",
  sony: "Sony Pictures",
  "sony-animation": "Sony Animation",
  netflix: "Netflix",
  abc: "ABC",
  freeform: "Freeform",
  hulu: "Hulu",
};

export const STUDIO_COLORS: Record<McuStudio, string> = {
  marvel: "var(--studio-marvel)",
  fox: "var(--studio-fox)",
  sony: "var(--studio-sony)",
  "sony-animation": "var(--studio-sony-animation)",
  netflix: "var(--studio-netflix)",
  abc: "var(--studio-abc)",
  freeform: "var(--studio-freeform)",
  hulu: "var(--studio-hulu)",
};

export const MCU_FORMATS = ["live", "animated"] as const;

export type McuFormat = (typeof MCU_FORMATS)[number];

export type ContainerKind = "film" | "tv" | "anim";

/** Franchises films à empiler dans le graphe (jamais le spine MCU). */
export const MOVIE_CHAIN_WHITELIST: readonly (readonly string[])[] = [
  ["spider-man-2002", "spider-man-2-2004", "spider-man-3-2007"],
  ["the-amazing-spider-man-2012", "the-amazing-spider-man-2-2014"],
  ["venom-2018", "venom-let-there-be-carnage-2021", "venom-the-last-dance-2024"],
  [
    "fantastic-four-2005",
    "fantastic-four-rise-of-the-silver-surfer-2007",
  ],
  [
    "spider-man-into-the-spider-verse-2018",
    "spider-man-across-the-spider-verse-2023",
    "spider-man-beyond-the-spider-verse-2027",
  ],
  ["x-men-2000", "x2-2003", "x-men-last-stand-2006"],
];

/** Films pivots — affichés plus grands dans le graphe */
export const MCU_MILESTONE_IDS = new Set([
  "the-avengers-2012",
  "avengers-age-of-ultron-2015",
  "captain-america-civil-war-2016",
  "avengers-infinity-war-2018",
  "avengers-endgame-2019",
  "spider-man-no-way-home-2021",
  "doctor-strange-mom-2022",
  "deadpool-wolverine-2024",
  "x-men-days-of-future-past-2014",
  "avengers-doomsday-2026",
  "avengers-secret-wars-2027",
]);

export function isMilestone(id: string) {
  return MCU_MILESTONE_IDS.has(id);
}

/** Axe horizontal central du graphe (Iron Man → Avengers → Civil War → …) */
export const MCU_SPINE_IDS = new Set([
  "iron-man-2008",
  "the-avengers-2012",
  "avengers-age-of-ultron-2015",
  "captain-america-civil-war-2016",
  "avengers-infinity-war-2018",
  "avengers-endgame-2019",
  "avengers-doomsday-2026",
  "avengers-secret-wars-2027",
]);

export function isSpine(id: string) {
  return MCU_SPINE_IDS.has(id);
}

export const McuItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["movie", "series", "special"]),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phase: z.string().min(1),
  order: z.number().int().positive(),
  track: z.enum(MCU_TRACKS),
  studio: z.enum(MCU_STUDIOS),
  format: z.enum(MCU_FORMATS),
  dependsOn: z.array(z.string()).default([]),
  runtimeMin: z.number().int().positive().optional(),
});

export const McuDataSchema = z
  .array(McuItemSchema)
  .nonempty()
  .superRefine((items, ctx) => {
    const seenIds = new Set<string>();
    const seenOrders = new Set<number>();
    const ids = new Set(items.map((item) => item.id));

    for (const item of items) {
      if (seenIds.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate id: ${item.id}`,
        });
      }
      seenIds.add(item.id);

      if (seenOrders.has(item.order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate order: ${item.order}`,
        });
      }
      seenOrders.add(item.order);

      for (const dependencyId of item.dependsOn) {
        if (!ids.has(dependencyId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown dependency "${dependencyId}" for ${item.id}`,
          });
        }
        if (dependencyId === item.id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Self dependency for ${item.id}`,
          });
        }
      }
    }
  });

export type McuItem = z.infer<typeof McuItemSchema>;

/** Ex. "Daredevil (Saison 2)" → "S2" */
export function getSeasonLabel(item: Pick<McuItem, "title" | "id" | "type">): string | null {
  if (item.type !== "series") return null;
  const fromTitle = item.title.match(/\(Saison\s+(\d+)\)/i);
  if (fromTitle) return `S${fromTitle[1]}`;
  const fromId = item.id.match(/-s(\d+)(?:-|$)/i);
  if (fromId) return `S${fromId[1]}`;
  return null;
}

/** Forme du conteneur : film / série TV / série animée */
export function getContainerKind(item: Pick<McuItem, "type" | "format">): ContainerKind {
  if (item.type === "series") {
    return item.format === "animated" ? "anim" : "tv";
  }
  return "film";
}
