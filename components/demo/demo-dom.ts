// Contratos DOM del tour (solo repo demo): TODO lo que el tour busca o clickea
// en la app vive acá. Antes estaba repartido por los motores y un cambio de copy
// o de clases lo rompía en silencio. Orden de prioridad al localizar:
//   1. hooks estables (data-slot / aria-label / estructura semántica)
//   2. respaldo por texto visible
// Si la app cambia algo de esto, se ajusta en un solo lugar.

const CLOSE_TEXTS = ["Cerrar", "Close"];

/** ¿Hay un diálogo modal abierto? (Radix lo marca con role="dialog") */
export function hasOpenDialog(): boolean {
  return !!document.querySelector('[role="dialog"]');
}

/** ¿Hay un Sheet lateral abierto? (p. ej. el detalle del pedido) */
export function hasOpenSheet(): boolean {
  return !!document.querySelector('[data-slot="sheet-content"]');
}

/** Botón de cierre del diálogo/sheet abierto. */
export function findDialogCloseButton(): HTMLButtonElement | null {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return null;
  // 1) hook de shadcn: Dialog y Sheet exponen data-slot en su botón de cierre.
  const stable = dialog.querySelector<HTMLButtonElement>(
    '[data-slot="dialog-close"], [data-slot="sheet-close"]',
  );
  if (stable) return stable;
  // 2) respaldo por texto: el modal de mesa oculta el cierre por defecto y pone
  // el suyo (aria-label sr-only "Cerrar").
  return (
    Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find((b) => {
      const text = (b.textContent ?? "").trim();
      const aria = b.getAttribute("aria-label") ?? "";
      return CLOSE_TEXTS.includes(text) || /^cerrar/i.test(aria);
    }) ?? null
  );
}

/** Cierra el diálogo/sheet abierto (si hay y tiene cierre accesible). */
export function closeOpenDialog(): boolean {
  const btn = findDialogCloseButton();
  if (!btn) return false;
  btn.click();
  return true;
}

/** El sidebar del POS (su <nav> etiquetado vive dentro del aside). */
function mobileSidebar(): HTMLElement | null {
  return (
    document.querySelector('nav[aria-label="Navegación principal"]')?.closest<HTMLElement>("aside") ??
    null
  );
}

/** Drawer del sidebar abierto (en móvil arranca fuera de pantalla). */
export function isMobileSidebarOpen(): boolean {
  const el = mobileSidebar();
  return !!el && el.getBoundingClientRect().left > -8;
}

/** Abre/cierra el drawer del sidebar con su botón real del header. */
export function toggleMobileSidebar(): boolean {
  const btn = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Abrir menú de navegación"]',
  );
  if (!btn) return false;
  btn.click();
  return true;
}

/** Drawer del carrito móvil (abre hacia la derecha; cerrado queda fuera de pantalla). */
function mobileCart(): HTMLElement | null {
  return document.querySelector<HTMLElement>('aside[aria-live="polite"]');
}

export function isMobileCartOpen(): boolean {
  const el = mobileCart();
  return !!el && el.getBoundingClientRect().left < 8;
}

/** Abre/cierra el carrito móvil con su botón real. */
export function toggleMobileCart(): boolean {
  const selector = isMobileCartOpen()
    ? 'button[aria-label="Cerrar carrito móvil"]'
    : 'button[aria-label="Abrir carrito móvil"]';
  const btn = document.querySelector<HTMLButtonElement>(selector);
  if (!btn) return false;
  btn.click();
  return true;
}

/** Scroller horizontal de columnas del kanban de Pedidos (móvil). */
export function ordersKanbanScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[aria-label="Columnas de pedidos"]');
}

/** Rect del hueco del spotlight (el objetivo que ilumina el tour), si hay uno. */
export function spotlightRect(): DOMRect | null {
  return document.querySelector("[data-demo-spotlight]")?.getBoundingClientRect() ?? null;
}
