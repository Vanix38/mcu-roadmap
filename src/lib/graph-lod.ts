export type GraphLod = "low" | "mid" | "high";

/** low < 0.35 ≤ mid < 0.75 ≤ high */
export function getGraphLod(scale: number): GraphLod {
  if (scale < 0.35) return "low";
  if (scale < 0.75) return "mid";
  return "high";
}
