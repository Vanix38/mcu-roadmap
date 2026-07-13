import { z } from "zod";

export const MCU_TRACKS = [
  "iron",
  "hulk",
  "thor",
  "cap",
  "guardians",
  "mystic",
  "antman",
  "spidey",
  "wakanda",
  "cosmic",
  "xmen",
  "misc",
  "merge",
] as const;

export type McuTrack = (typeof MCU_TRACKS)[number];

/** Films pivots — affichés plus grands dans le graphe */
export const MCU_MILESTONE_IDS = new Set([
  "iron-man-2008",
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

/** Axe vertical central du graphe (Iron Man → Avengers → Civil War → …) */
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
