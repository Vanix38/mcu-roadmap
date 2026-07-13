/** Positions issues de Classeur1.csv (row/col 0-indexés) */
export const MCU_GRID_POSITIONS: Record<string, { row: number; col: number }> = {
  "iron-man-2008": { row: 1, col: 1 },
  "iron-man-2-2010": { row: 2, col: 1 },
  "captain-america-the-first-avenger-2011": { row: 2, col: 2 },
  "thor-2011": { row: 2, col: 5 },
  "the-incredible-hulk-2008": { row: 2, col: 20 },
  "the-avengers-2012": { row: 3, col: 4 },
  "iron-man-3-2013": { row: 4, col: 1 },
  "captain-america-the-winter-soldier-2014": { row: 4, col: 2 },
  "thor-the-dark-world-2013": { row: 4, col: 5 },
  "avengers-age-of-ultron-2015": { row: 5, col: 4 },
  "ant-man-2015": { row: 6, col: 0 },
  "captain-america-civil-war-2016": { row: 6, col: 2 },
  "thor-ragnarok-2017": { row: 6, col: 5 },
  "guardians-of-the-galaxy-2014": { row: 6, col: 6 },
  "ant-man-and-the-wasp-2018": { row: 7, col: 0 },
  "black-widow-2021": { row: 7, col: 3 },
  "guardians-of-the-galaxy-vol-2-2017": { row: 7, col: 6 },
  "spider-man-homecoming-2017": { row: 7, col: 7 },
  "doctor-strange-2016": { row: 7, col: 8 },
  "black-panther-2018": { row: 7, col: 11 },
  "avengers-infinity-war-2018": { row: 8, col: 4 },
  "i-am-groot-2022": { row: 8, col: 6 },
  "captain-marvel-2019": { row: 8, col: 12 },
  "avengers-endgame-2019": { row: 9, col: 4 },
  "ant-man-quantumania-2023": { row: 10, col: 0 },
  "falcon-winter-soldier-2021": { row: 10, col: 2 },
  "gotg-holiday-special-2022": { row: 10, col: 6 },
  "spider-man-far-from-home-2019": { row: 10, col: 7 },
  "wandavision-2021": { row: 10, col: 9 },
  "black-panther-wakanda-forever-2022": { row: 10, col: 11 },
  "ms-marvel-2022": { row: 10, col: 13 },
  "hawkeye-2021": { row: 10, col: 14 },
  "loki-s1-2021": { row: 10, col: 15 },
  "fantastic-four-first-steps-2025": { row: 10, col: 16 },
  "moon-knight-2022": { row: 10, col: 17 },
  "shang-chi-2021": { row: 10, col: 18 },
  "eternals-2021": { row: 10, col: 19 },
  "captain-america-brave-new-world-2025": { row: 11, col: 2 },
  "thor-love-and-thunder-2022": { row: 11, col: 5 },
  "spider-man-no-way-home-2021": { row: 11, col: 7 },
  "ironheart-2025": { row: 11, col: 11 },
  "the-marvels-2023": { row: 11, col: 12 },
  "echo-2024": { row: 11, col: 14 },
  "loki-s2-2023": { row: 11, col: 15 },
  "thunderbolts-2025": { row: 12, col: 2 },
  "spider-man-brand-new-day-2026": { row: 12, col: 7 },
  "doctor-strange-mom-2022": { row: 12, col: 8 },
  "agatha-all-along-2024": { row: 12, col: 10 },
  "daredevil-born-again-s1-2025": { row: 12, col: 14 },
  "avengers-doomsday-2026": { row: 13, col: 4 },
  "vision-quest-2026": { row: 13, col: 9 },
  "daredevil-born-again-s2-2026": { row: 13, col: 14 },
};

export const GRID_COL_WIDTH = 300;
export const GRID_ROW_HEIGHT = 230;
export const GRID_PADDING_X = 64;
export const GRID_PADDING_Y = 56;

/** Colonne tout à droite pour les entrées hors CSV */
export const GRID_OVERFLOW_COL = 22;

const GRID_MAX_ROW = 13;
const GRID_MAX_ORDER = 65;

export function gridX(col: number) {
  return GRID_PADDING_X + col * GRID_COL_WIDTH + GRID_COL_WIDTH / 2;
}

export function gridY(row: number) {
  return GRID_PADDING_Y + (row - 1) * GRID_ROW_HEIGHT + GRID_ROW_HEIGHT / 2;
}

/** Niveau vertical pour les entrées hors grille (basé sur order) */
export function orderToGridRow(order: number) {
  if (order <= GRID_MAX_ORDER) {
    return 1 + Math.round(((order - 1) / (GRID_MAX_ORDER - 1)) * (GRID_MAX_ROW - 1));
  }
  return GRID_MAX_ROW + Math.ceil((order - GRID_MAX_ORDER) / 2);
}
