// Configuración del modo demo (solo repo demo).
// El fork es exclusivamente la demo pública: el modo demo va encendido salvo
// que se desactive explícitamente con NEXT_PUBLIC_DEMO_MODE=0.

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "0";

/** Nombre de la cookie de sesión de demo (firmada, httpOnly). */
export const DEMO_SESSION_COOKIE = "demo_session";

/** Vida de la cookie de sesión (12 h). */
export const DEMO_SESSION_MAX_AGE_S = 60 * 60 * 12;

/** Minutos sin actividad tras los que un claim se considera abandonado (GC). */
export const DEMO_CLAIM_TTL_MINUTES = 60;

/** Horas tras las que una orden activa huérfana se cancela en el GC. */
export const DEMO_ORDER_TTL_HOURS = 24;
