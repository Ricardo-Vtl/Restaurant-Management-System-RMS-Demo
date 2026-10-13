// Matcher de elementos objetivo del tour (solo repo demo).
// Un target es un selector CSS o el texto visible/aria-label de un control.
// Soporta `within` (control dentro de un contenedor, p. ej. la tarjeta de una
// mesa concreta) y placeholders como "§table" resueltos con la sesión.

export interface TourTarget {
  selector?: string;
  text?: string;
  /** Restringe la búsqueda a un contenedor (selector o texto). */
  within?: TourTarget;
}

export interface TargetVars {
  /** Número de la mesa reclamada por la sesión. */
  table?: string;
}

export interface FindTargetOptions {
  /**
   * Permite localizar elementos fuera de pantalla a la DERECHA (p. ej. una
   * columna oculta de un carrusel horizontal): el tour los traerá a la vista.
   * Nunca relaja el descarte de la izquierda (sidebar móvil colapsado).
   */
  includeOffscreenRight?: boolean;
  /** Valores para resolver placeholders (§table). */
  vars?: TargetVars;
}

const INTERACTIVE =
  "button, a, [role='button'], [role='tab'], [role='menuitem'], [role='radio']";

const TABLE_LABEL_RE = /Mesa\s+\S+/g;

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Reemplaza placeholders (§table) por valores de la sesión. */
export function substitute(text: string, vars: TargetVars): string {
  return text.replace(/§table/g, vars.table ?? "");
}

/**
 * Visible y alcanzable: descarta ocultos y elementos fuera de pantalla a la
 * izquierda/arriba (ej. sidebar móvil colapsado). Permitir "debajo del fold":
 * el spotlight lo scrollea a la vista.
 */
function isVisible(el: Element, opts: FindTargetOptions = {}): boolean {
  const r = el.getBoundingClientRect();
  return (
    el.getClientRects().length > 0 &&
    r.width > 0 &&
    r.height > 0 &&
    r.right > 0 &&
    r.bottom > 0 &&
    (opts.includeOffscreenRight || r.left < window.innerWidth)
  );
}

/**
 * ¿El control vive en la tarjeta de la mesa buscada y no en un contenedor que
 * agrupa varias mesas? Sube por los ancestros hasta uno que mencione la mesa
 * objetivo y que no contenga etiquetas de OTRAS mesas.
 */
function matchWithin(el: Element, wanted: string): boolean {
  let node = el.parentElement;
  while (node !== null) {
    const text = normalize(node.textContent ?? "");
    if (text.includes(wanted)) {
      const labels = new Set((text.match(TABLE_LABEL_RE) ?? []).map(normalize));
      labels.delete(wanted);
      if (labels.size === 0) return true;
    }
    node = node.parentElement;
  }
  return false;
}

/** Primer elemento visible que corresponde al target (match exacto antes que parcial). */
export function findTargetElement(
  target: TourTarget,
  opts: FindTargetOptions = {},
): Element | null {
  const vars = opts.vars ?? {};

  if (target.selector) {
    const el = document.querySelector(target.selector);
    return el && isVisible(el, opts) ? el : null;
  }
  if (!target.text) return null;

  const wanted = normalize(substitute(target.text, vars));
  const withinText = target.within?.text
    ? normalize(substitute(target.within.text, vars))
    : null;
  const withinSelector = target.within?.selector ?? null;

  const passesWithin = (el: Element): boolean => {
    if (withinSelector) return !!el.closest(withinSelector);
    if (withinText) return matchWithin(el, withinText);
    return true;
  };

  const matches = (el: Element, compare: (value: string) => boolean): boolean => {
    const aria = el.getAttribute("aria-label");
    return (!!aria && compare(normalize(aria))) || compare(normalize(el.textContent ?? ""));
  };

  const nodes = Array.from(document.querySelectorAll(INTERACTIVE)).filter((el) =>
    isVisible(el, opts),
  );

  for (const el of nodes) {
    if (matches(el, (v) => v === wanted) && passesWithin(el)) return el;
  }
  for (const el of nodes) {
    if (matches(el, (v) => v.includes(wanted)) && passesWithin(el)) return el;
  }
  return null;
}
