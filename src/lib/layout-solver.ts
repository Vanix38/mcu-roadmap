import type { McuItem } from "./mcu";

export type GridPos = { row: number; col: number };

/** Incrémenter quand LAYOUT_OVERRIDES change — force recentrage du graphe */
export const LAYOUT_REVISION = "2026-07-18-olk-under-ba2";

/** Positions grille LTR — row = piste, col = temps */
export const LAYOUT_OVERRIDES: Record<string, GridPos> = {
  "agatha-all-along-2024": { row: 33, col: 11 },
  "agents-of-shield-s1-2013": { row: 5, col: 5 },
  "agents-of-shield-s2-2014": { row: 5, col: 6 },
  "agents-of-shield-s3-2015": { row: 5, col: 7 },
  "agents-of-shield-s4-2016": { row: 5, col: 8 },
  "agents-of-shield-s5-2017": { row: 5, col: 9 },
  "agents-of-shield-s6-2019": { row: 5, col: 10 },
  "agents-of-shield-s7-2020": { row: 5, col: 11 },
  "ant-man-2015": { row: 8, col: 6 },
  "ant-man-and-the-wasp-2018": { row: 8, col: 7 },
  "ant-man-quantumania-2023": { row: 14, col: 10 },
  "avengers-age-of-ultron-2015": { row: 7, col: 5 },
  "avengers-doomsday-2026": { row: 32, col: 18 },
  "avengers-endgame-2019": { row: 13, col: 9 },
  "avengers-infinity-war-2018": { row: 13, col: 8 },
  "avengers-secret-wars-2027": { row: 32, col: 19 },
  "black-panther-2018": { row: 9, col: 7 },
  "black-panther-wakanda-forever-2022": { row: 31, col: 10 },
  "black-widow-2021": { row: 7, col: 7 },
  "captain-america-brave-new-world-2025": { row: 16, col: 11 },
  "captain-america-civil-war-2016": { row: 7, col: 6 },
  "captain-america-the-first-avenger-2011": { row: 3, col: 2 },
  "captain-america-the-winter-soldier-2014": { row: 7, col: 4 },
  "captain-marvel-2019": { row: 12, col: 8 },
  "cloak-and-dagger-s1-2018": { row: 26, col: 1 },
  "cloak-and-dagger-s2-2019": { row: 26, col: 2 },
  "daredevil-born-again-s1-2025": { row: 46, col: 15 },
  "daredevil-born-again-s2-2026": { row: 46, col: 16 },
  "daredevil-s1-2015": { row: 41, col: 11 },
  "daredevil-s2-2016": { row: 41, col: 12 },
  "daredevil-s3-2018": { row: 44, col: 14 },
  "deadpool-2-2018": { row: 31, col: 16 },
  "deadpool-2016": { row: 31, col: 15 },
  "deadpool-wolverine-2024": { row: 31, col: 17 },
  "doctor-strange-2016": { row: 12, col: 6 },
  "doctor-strange-mom-2022": { row: 32, col: 17 },
  "echo-2024": { row: 46, col: 11 },
  "eternals-2021": { row: 18, col: 10 },
  "eyes-of-wakanda-2025": { row: 9, col: 8 },
  "falcon-winter-soldier-2021": { row: 16, col: 10 },
  "fant4stic-2015": { row: 27, col: 1 },
  "fantastic-four-2005": { row: 30, col: 15 },
  "fantastic-four-first-steps-2025": { row: 24, col: 10 },
  "fantastic-four-rise-of-the-silver-surfer-2007": { row: 30, col: 16 },
  "gotg-holiday-special-2022": { row: 20, col: 11 },
  "guardians-of-the-galaxy-2014": { row: 14, col: 6 },
  "guardians-of-the-galaxy-vol-2-2017": { row: 14, col: 7 },
  "guardians-of-the-galaxy-vol-3-2023": { row: 20, col: 12 },
  "hawkeye-2021": { row: 46, col: 10 },
  "i-am-groot-2022": { row: 14, col: 8 },
  "i-am-groot-s2-2023": { row: 14, col: 9 },
  "inhumans-2017": { row: 6, col: 8 },
  "iron-fist-s1-2017": { row: 40, col: 11 },
  "iron-fist-s2-2018": { row: 43, col: 14 },
  "iron-man-2-2010": { row: 2, col: 2 },
  "iron-man-2008": { row: 2, col: 1 },
  "iron-man-3-2013": { row: 5, col: 4 },
  "ironheart-2025": { row: 31, col: 11 },
  "jessica-jones-s1-2015": { row: 38, col: 11 },
  "jessica-jones-s2-2018": { row: 41, col: 14 },
  "jessica-jones-s3-2019": { row: 41, col: 15 },
  "kraven-the-hunter-2024": { row: 29, col: 2 },
  "logan-2017": { row: 28, col: 15 },
  "loki-s1-2021": { row: 25, col: 10 },
  "loki-s2-2023": { row: 25, col: 11 },
  "luke-cage-s1-2016": { row: 39, col: 12 },
  "luke-cage-s2-2018": { row: 42, col: 14 },
  "madame-web-2024": { row: 29, col: 3 },
  "marvel-zombies-2025": { row: 14, col: 11 },
  "moon-knight-2022": { row: 19, col: 10 },
  "morbius-2022": { row: 29, col: 1 },
  "ms-marvel-2022": { row: 30, col: 10 },
  "punisher-one-last-kill-2026": { row: 47, col: 16 },
  "secret-invasion-2023": { row: 22, col: 10 },
  "shang-chi-2021": { row: 17, col: 10 },
  "she-hulk-2022": { row: 21, col: 10 },
  "spider-man-2-2004": { row: 36, col: 11 },
  "spider-man-2002": { row: 36, col: 10 },
  "spider-man-3-2007": { row: 36, col: 12 },
  "spider-man-across-the-spider-verse-2023": { row: 30, col: 2 },
  "spider-man-beyond-the-spider-verse-2027": { row: 30, col: 3 },
  "spider-man-brand-new-day-2026": { row: 37, col: 17 },
  "spider-man-far-from-home-2019": { row: 35, col: 10 },
  "spider-man-homecoming-2017": { row: 10, col: 7 },
  "spider-man-into-the-spider-verse-2018": { row: 30, col: 1 },
  "spider-man-no-way-home-2021": { row: 37, col: 13 },
  "the-amazing-spider-man-2-2014": { row: 37, col: 12 },
  "the-amazing-spider-man-2012": { row: 37, col: 11 },
  "the-avengers-2012": { row: 5, col: 3 },
  "the-defenders-2017": { row: 41, col: 13 },
  "the-incredible-hulk-2008": { row: 4, col: 2 },
  "the-marvels-2023": { row: 30, col: 11 },
  "the-new-mutants-2020": { row: 27, col: 3 },
  "the-punisher-s1-2017": { row: 45, col: 13 },
  "the-punisher-s2-2019": { row: 45, col: 14 },
  "the-wolverine-2013": { row: 26, col: 13 },
  "thor-2011": { row: 5, col: 2 },
  "thor-love-and-thunder-2022": { row: 20, col: 10 },
  "thor-ragnarok-2017": { row: 11, col: 6 },
  "thor-the-dark-world-2013": { row: 6, col: 4 },
  "thunderbolts-2025": { row: 16, col: 17 },
  "venom-2018": { row: 28, col: 1 },
  "venom-let-there-be-carnage-2021": { row: 28, col: 2 },
  "venom-the-last-dance-2024": { row: 28, col: 3 },
  "vision-quest-2026": { row: 34, col: 11 },
  "wandavision-2021": { row: 32, col: 10 },
  "werewolf-by-night-2022": { row: 27, col: 2 },
  "what-if-s1-2021": { row: 15, col: 10 },
  "what-if-s2-2023": { row: 15, col: 11 },
  "what-if-s3-2024": { row: 15, col: 12 },
  "wonder-man-2026": { row: 23, col: 10 },
  "x-men-2000": { row: 26, col: 10 },
  "x-men-97-s1-2024": { row: 31, col: 2 },
  "x-men-97-s2-2026": { row: 31, col: 3 },
  "x-men-apocalypse-2016": { row: 27, col: 15 },
  "x-men-dark-phoenix-2019": { row: 27, col: 16 },
  "x-men-days-of-future-past-2014": { row: 27, col: 14 },
  "x-men-first-class-2011": { row: 27, col: 13 },
  "x-men-last-stand-2006": { row: 26, col: 12 },
  "x-men-origins-wolverine-2009": { row: 29, col: 16 },
  "x2-2003": { row: 26, col: 11 },
  "your-friendly-neighborhood-spiderman-s1-2025": { row: 31, col: 1 },
};

/** Retourne les positions définies dans LAYOUT_OVERRIDES */
export function getGridPositions(items: readonly McuItem[]): Record<string, GridPos> {
  const positions: Record<string, GridPos> = {};

  for (const item of items) {
    const pos = LAYOUT_OVERRIDES[item.id];
    if (pos) positions[item.id] = { ...pos };
  }

  return positions;
}

/** @deprecated Alias de getGridPositions */
export const solveGridPositions = getGridPositions;

export function formatGridPositions(positions: Record<string, GridPos>): string {
  const lines = Object.entries(positions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, pos]) => `  "${id}": { row: ${pos.row}, col: ${pos.col} },`);
  return `export const MCU_GRID_POSITIONS: Record<string, { row: number; col: number }> = {\n${lines.join("\n")}\n};`;
}
