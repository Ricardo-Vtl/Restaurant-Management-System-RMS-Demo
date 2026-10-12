// Semántica de horarios del restaurante (white-label, zona horaria IANA).
// Todo puro y determinista: `now` se inyecta para poder testear.

export interface DaySchedule {
  open: string;
  close: string;
  closed?: boolean;
}

export type WeekSchedule = Record<string, DaySchedule | undefined>;

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function localDayAndMinutes(now: Date, timezone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { day: day === -1 ? 0 : day, minutes: hour * 60 + minute };
}

/**
 * Abierto ahora. Día ausente o `closed` = cerrado. Si el cierre es anterior a la
 * apertura (13:00–01:00) el turno cruza la medianoche: la cola [00:00, close)
 * pertenece al turno del día anterior. `closed_until` manda sobre todo.
 */
export function isOpenNow(
  schedule: WeekSchedule | null | undefined,
  timezone: string,
  closedUntil: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (closedUntil) {
    const until = closedUntil instanceof Date ? closedUntil : new Date(closedUntil);
    if (!Number.isNaN(until.getTime()) && now < until) return false;
  }
  if (!schedule) return true;

  const { day, minutes } = localDayAndMinutes(now, timezone);
  const yesterday = (day + 6) % 7;

  const today = schedule[String(day)];
  if (today && !today.closed) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (close > open && minutes >= open && minutes < close) return true;
    if (close < open && minutes >= open) return true;
  }

  const prev = schedule[String(yesterday)];
  if (prev && !prev.closed) {
    const open = toMinutes(prev.open);
    const close = toMinutes(prev.close);
    if (close < open && minutes < close) return true;
  }

  return false;
}

/** Próxima apertura en texto corto ("hoy a las 11:00", "mañana a las 11:00", "el lunes a las 11:00"). */
export function nextOpeningText(
  schedule: WeekSchedule | null | undefined,
  timezone: string,
  closedUntil: string | Date | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!schedule) return null;
  const until = closedUntil
    ? closedUntil instanceof Date
      ? closedUntil
      : new Date(closedUntil)
    : null;
  const from = until && !Number.isNaN(until.getTime()) && until > now ? until : now;

  const { day, minutes } = localDayAndMinutes(from, timezone);
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const sched = schedule[String(d)];
    if (!sched || sched.closed) continue;
    const open = toMinutes(sched.open);
    const close = toMinutes(sched.close);
    const inShift = close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
    if (i === 0 && inShift) return "hoy";
    if (i === 0 && minutes >= open) continue;
    const when = i === 0 ? "hoy" : i === 1 ? "mañana" : `el ${DAY_NAMES[d]}`;
    return `${when} a las ${sched.open}`;
  }
  return null;
}
