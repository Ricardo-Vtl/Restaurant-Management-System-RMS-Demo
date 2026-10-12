// Matcher de elementos objetivo del tour (solo repo demo).
// Un target es un selector CSS o el texto visible/aria-label de un control.

export interface TourTarget {
  selector?: string;
  text?: string;
}

const INTERACTIVE =
  "button, a, [role='button'], [role='tab'], [role='menuitem'], [role='radio']";

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Visible y alcanzable: descarta ocultos y elementos fuera de pantalla a la
 * izquierda/arriba (ej. sidebar móvil colapsado). Permitir "debajo del fold":
 * el spotlight lo scrollea a la vista.
 */
function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return (
    el.getClientRects().length > 0 &&
    r.width > 0 &&
    r.height > 0 &&
    r.right > 0 &&
    r.bottom > 0 &&
    r.left < window.innerWidth
  );
}

/** Primer elemento visible que corresponde al target (match exacto antes que parcial). */
export function findTargetElement(target: TourTarget): Element | null {
  if (target.selector) {
    const el = document.querySelector(target.selector);
    return el && isVisible(el) ? el : null;
  }
  if (!target.text) return null;

  const wanted = normalize(target.text);
  const nodes = Array.from(document.querySelectorAll(INTERACTIVE)).filter(isVisible);

  for (const el of nodes) {
    const aria = el.getAttribute("aria-label");
    if (aria && normalize(aria) === wanted) return el;
    if (normalize(el.textContent ?? "") === wanted) return el;
  }
  for (const el of nodes) {
    const aria = el.getAttribute("aria-label");
    if (aria && normalize(aria).includes(wanted)) return el;
    if (normalize(el.textContent ?? "").includes(wanted)) return el;
  }
  return null;
}
