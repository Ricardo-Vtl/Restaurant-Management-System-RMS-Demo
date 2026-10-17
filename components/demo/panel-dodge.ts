// Geometría del panel del tour (sin React): cuánto debe apartarse para no tapar
// el objetivo que ilumina el spotlight. El panel vive abajo a la derecha y varias
// acciones del POS (p. ej. "Enviar a Cocina" en el pie de la comanda) caen en esa
// misma franja: sin apartarse, el panel tapa parte del botón.

export interface RectBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** Aire que se deja entre el panel y el objetivo. */
export const PANEL_DODGE_GAP_PX = 16;
/** Margen mínimo con el borde superior de la ventana. */
export const PANEL_DODGE_TOP_MARGIN_PX = 16;

/**
 * Desplazamiento vertical (≤ 0) que deja el panel por encima del objetivo.
 * Devuelve 0 si no hay solapamiento o si el panel no puede subir.
 *
 * shortcut: si el objetivo fuese más alto que la franja disponible, el apartado
 * queda parcial (el panel se clava en el margen superior) — suficiente para los
 * targets reales del tour (botones y tarjetas de 68–188 px).
 */
export function computePanelDodgeY(opts: {
  target: RectBox;
  panel: RectBox;
}): number {
  const { target, panel } = opts;
  const overlaps =
    panel.left < target.right &&
    panel.right > target.left &&
    panel.top < target.bottom &&
    panel.bottom > target.top;
  if (!overlaps) return 0;

  // Sube lo justo para dejar el aire por debajo del panel (needed < 0).
  const needed = target.top - PANEL_DODGE_GAP_PX - panel.bottom;
  // Techo: hasta dónde puede subir sin salirse de la ventana (≤ 0 si ya está pegado).
  const limit = Math.min(0, PANEL_DODGE_TOP_MARGIN_PX - panel.top);
  return Math.min(0, Math.max(needed, limit));
}
