export const VIEW_MODES = ["journey", "list", "graph"] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW_MODE: ViewMode = "journey";

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  journey: "Parcours",
  list: "Liste",
  graph: "Graphe",
};

export function isViewMode(value: unknown): value is ViewMode {
  return (
    typeof value === "string" &&
    (VIEW_MODES as readonly string[]).includes(value)
  );
}
