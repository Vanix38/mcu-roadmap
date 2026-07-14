/** Constantes de grille LTR — col = temps (gauche→droite), row = piste (haut→bas) */

/** Espacement horizontal (axe temps) */
export const GRID_COL_WIDTH = 320;
/** Espacement vertical (axe piste) */
export const GRID_ROW_HEIGHT = 230;
export const GRID_PADDING_X = 64;
export const GRID_PADDING_Y = 56;

/** Ligne tout en bas pour les entrées hors grille */
export const GRID_OVERFLOW_ROW = 22;

const GRID_MAX_COL = 16;
const GRID_MAX_ORDER = 65;

export function gridX(col: number) {
  return GRID_PADDING_X + col * GRID_COL_WIDTH + GRID_COL_WIDTH / 2;
}

export function gridY(row: number) {
  return GRID_PADDING_Y + (row - 1) * GRID_ROW_HEIGHT + GRID_ROW_HEIGHT / 2;
}

/** Colonne temps pour les entrées hors grille (basé sur order) */
export function orderToGridCol(order: number) {
  if (order <= GRID_MAX_ORDER) {
    return 1 + Math.round(((order - 1) / (GRID_MAX_ORDER - 1)) * (GRID_MAX_COL - 1));
  }
  return GRID_MAX_COL + Math.ceil((order - GRID_MAX_ORDER) / 2);
}
