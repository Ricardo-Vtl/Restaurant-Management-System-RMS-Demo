# Changelog

Todos los cambios notables del proyecto **Restaurant Management System (RMS)**.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/); el proyecto usa **Conventional Commits** en inglés.

> **Nota:** este changelog es **retroactivo** (reconstruido desde `git log`). El histórico anterior a Oct 2026 está **resumido por hito**; desde el 11 Oct 2026 el detalle es completo. Para el registro exhaustivo commit a commit, ver `git log`.

---

## [2026-10-13] — Off-branding de la documentación + doctrina

Se elimina toda referencia literal a la marca/negocio del sistema. El producto se documenta como **Restaurant Management System (RMS)** y la identidad queda 100% dinámica vía `restaurant_config`. El código ya estaba des-marcado (el literal solo vivía en documentación).

### Changed
- Sweep de docs (`README`, `AGENTS`, `CHANGELOG`, `DOCUMENTACION_TECNICA_GLOBAL`, `plan/*`, `WHITE_LABEL_PLAN`, `AUDITORIA_UNIFICACION_COMPONENTES`, `TEST_PLAN`): sin nombres de negocio; ejemplos con placeholders (`Mi Restaurante`, `mi-restaurante`, `hola@example.com`, `@staff.internal`).
- Ejemplos stale alineados al código real: canal realtime `pos-live`, `storageKey` `pos-auth`, dominio de staff `@staff.internal`.
- `DOCUMENTACION_TECNICA_GLOBAL`: nota de staleness de stores (vigentes `auth-store` + `cart-store`; órdenes/mesas/productos vía React Query).

### Added
- Doctrina "cero marca hardcodeada" en `AGENTS.md` y `docs/DESIGN_SYSTEM.md`.

### Notes
- `docs/audits/` (informes históricos) se conserva sin cambios.

---

## [2026-10-13] — Rediseño de UI/UX: 9 módulos + shell + unificación de cobro

Gran bloque de auditoría y unificación de diseño en todo el panel. Guía resultante: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

### Added
- `docs/DESIGN_SYSTEM.md` — línea de diseño viva (tokens, patrones, doctrina responsive/a11y).
- `lib/use-snap-carousel.ts` — hook de carrusel con scroll-snap reutilizado por Pedidos y KDS.
- Stats strips por módulo (con `StatCard` unificado): Pedidos, KDS, Caja, Menú, Logística, Personal, Dashboard, Mesas.
- `CheckoutDialog` (`components/gestion/checkout-dialog.tsx`) — diálogo de cobro único.
- Menú: rail de categorías sticky + cards premium con imagen 4:3 y precio en píldora.
- Personal: directorio en tarjetas con avatares y chips de rol por color/ícono.
- Logística: menú `⋯` de acciones por insumo (`supply-actions-menu.tsx`).
- Header del panel: **popover de órdenes pendientes** (antes: campana decorativa).

### Changed
- **Móvil-first** en Pedidos (kanban full-width con snap, drawer, modal de orden, tabla→tarjetas), KDS (carrusel de paneles), Caja, Menú, Logística, Personal, Configuración, Dashboard, Mesas.
- Header de página unificado (barra coral + `uppercase italic`) en todos los módulos.
- Tablas de >3 columnas → **tarjetas `< md`** (Pedidos, Logística, Personal).
- Dialogs: `max-h-[90dvh]` + scroll, header con tile de ícono, footer apilado móvil, targets ≥44 px.
- Tokens: utilidades crudas (`bg-gray-*`/`bg-red-*`/`bg-blue-*`) → `muted`/`destructive`/`emerald`.
- Historial de Pedidos: el "Tiempo" pasó a **duración congelada** (y `formatElapsed` con horas).
- Micro-tipografía subida a ≥12 px en móvil (desktop intacto).

### Fixed
- Mesas: `mesa-card` convertida a `<button>` (eliminado interactivo anidado); `text-md` inválido → `text-base`; scroll horizontal eliminado.
- Caja/Checkout: overflow del modal en landscape; contraste del subtítulo; foco visible en el selector de método.
- Sidebar: acentos (`Menú`/`Logística`/`Configuración`) + nombre accesible en nav **colapsado**.
- Shell: eliminado el buscador decorativo del header.

### Removed
- `app/gestion/caja/_components/caja-checkout-dialog.tsx` y `components/gestion/CheckoutModal.tsx` (≈300 líneas duplicadas; unificados).

---

## [2026-10-11 / 2026-10-12] — Shell responsive, Config/Inventario/SEO y fixes móvil

### Added
- `feat(inventory)`: módulo de stock con **descuento automático por receta** (trigger), libro inmutable (`supply_movements`), recetas con override por talla, alertas + badge en sidebar (migración `20261011120000`).
- `feat(config)`: módulo white-label (identidad, colores, contacto, horarios, canales, impuestos, ops) + carrusel hero + upload (migraciones `20261009*`).
- `feat(seo)`: metadata + JSON-LD dinámicos desde `restaurant_config`; `restaurant_config` como **fuente única de branding**.

### Fixed
- Shell y landing responsive; cierre del drawer móvil al navegar; overflow horizontal de la landing; PIN pad móvil visible (sin teclado virtual); overflow horizontal de Mesas; modal Configurar Local como card.

---

## [2026-10-03 / 2026-10-09] — Caja y checklist manual E2E

### Added
- `feat(caja)`: módulo de caja (cobro por orden/mesa, RPC `complete_order_checkout`, resumen del día por método, dialog 3 métodos).

### Fixed
- Checklist manual E2E (Playwright + BD): precios de tamaños absolutos, cascada de estados solo-avance, auto-ready con items mixtos, `payment_method` en el resumen, totales sin "flapping", toast exacto de items sin entregar, cuentas no-cobradas visibles, `aria-label` limpios, `sizes`/`priority` de `next/image`, logout sin warning realtime, sin flash del gate, reset de método de pago, `/api/*` en frío (upgrade Next 16.2.7 → 16.4.0), staff inactivo → 401 + logout.

---

## [2026-09] — Staff y módulos POS

### Added
- `feat(staff)`: módulo Personal (RPCs `create_staff_user`/`set_staff_pin`, PIN hasheado, anti-lockout, `staff:manage`).

### Fixed
- Cierre de hallazgos del run manual (payload de modificadores, cola KDS, a11y, flujo walk-in `confirmed`).

---

## [2026-08] — Auditoría v9 (seguridad, integridad, rendimiento, a11y)

### Fixed
- **Seguridad:** REVOKE de escrituras a `anon`/`authenticated` (V9-SEC-01); RPCs transaccionales cerrando bypass de PATCH (V9-SEC-02); login endurecido (PIN 6 dígitos, IP confiable, bloqueo por IP/PIN, password Auth derivado — V9-SEC-03); precios 100% server-side (V9-SEC-04); mutaciones bulk con `id` obligatorio (V9-SEC-05); `search_path` fijo en `SECURITY DEFINER` (V9-SEC-06).
- **Integridad/DB:** `orders.payment_method` + checkout sin items en cocina (V9-DB-04); `CHECK`/`UNIQUE`/secuencia (V9-DB-05/07); índices de FKs (V9-DB-06); drift de migraciones alineado + enum `payment_method` (V9-DB-02); esquema base en migraciones (Fase 4).
- **Rendimiento:** ventana de órdenes server-side + debounce realtime (V9-PERF-01); ticker de 1 s compartido + derivados memoizados (V9-PERF-02/03).
- **Arquitectura:** fuente única de permisos `lib/abilities.ts` (V9-ARQ-01/02); invariante de sillas (V9-ARQ-03).
- **Cálculo:** formato uniforme de dinero `formatCurrency` (V9-CAL-07); tests sin código muerto (V9-CAL-05).
- **Auth:** fix del 401 tras logout (poisoning del singleton `supabaseAdmin`).

---

## [2026-07] — Pedidos, KDS, migraciones y base de seguridad

### Added
- `feat(pedidos)`: módulo Pedidos (schema, API, kanban, historial con paginación, barra de stats).
- `feat(kds)`: Kitchen Display System (columnas, marcar items listos, endpoint atómico, sonido).
- Autenticación por RPC + RLS; migración de escrituras a API server-side; TanStack Query; Zustand.
- Migraciones Supabase + CLI; `database.types.ts` derivados; realtime.

### Changed
- Layout de gestión fluido/responsive; refactor de Mesas a `_hooks/_utils/_components`; migración a RHF+Zod del form de producto.

### Fixed
- Auditorías v2–v7: seguridad, tipos, a11y, rendimiento; `order_number` a `bigint`; FK orders↔tables.

---

## [2026-03 / 2026-06] — Fundación

- Versiones iniciales (v1.0 → v1.3): landing, catálogo, carrito/WhatsApp, panel de Mesas, integración Supabase (Auth staff + persistencia de menú).
- Refactor de la cascada de mesas y del borrado lógico (`is_active`).
