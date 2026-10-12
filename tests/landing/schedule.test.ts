import { describe, it, expect } from "vitest";
import { isOpenNow, nextOpeningText, type WeekSchedule } from "@/lib/schedule";

const TZ = "America/Mexico_City"; // UTC-6 (sin DST desde 2022)

// 2026-10-12 es lunes
const mondayNoonUTC = new Date("2026-10-12T18:00:00Z"); // 12:00 local MX
const monday10amUTC = new Date("2026-10-12T16:00:00Z"); // 10:00 local MX

const week: WeekSchedule = {
  "0": { open: "11:00", close: "21:00", closed: false },
  "1": { open: "11:00", close: "21:00", closed: false },
  "2": { open: "11:00", close: "21:00", closed: false },
  "3": { open: "11:00", close: "21:00", closed: false },
  "4": { open: "11:00", close: "21:00", closed: false },
  "5": { open: "13:00", close: "01:00", closed: false },
  "6": { open: "12:00", close: "23:30", closed: false },
};

describe("isOpenNow", () => {
  it("abierto dentro del horario del día", () => {
    expect(isOpenNow(week, TZ, null, mondayNoonUTC)).toBe(true);
    expect(isOpenNow(week, TZ, null, monday10amUTC)).toBe(false);
  });

  it("día ausente o marcado closed = cerrado", () => {
    expect(isOpenNow({}, TZ, null, mondayNoonUTC)).toBe(false);
    expect(isOpenNow({ "1": { open: "11:00", close: "21:00", closed: true } }, TZ, null, mondayNoonUTC)).toBe(false);
  });

  it("cruce de medianoche: cola de madrugada pertenece al turno del día anterior", () => {
    // Viernes 13:00–01:00 → sábado 00:30 local (06:30Z del sábado) sigue abierto
    const sat0030 = new Date("2026-10-17T06:30:00Z");
    expect(isOpenNow(week, TZ, null, sat0030)).toBe(true);
    // sábado 01:30 local → cerrado
    const sat0130 = new Date("2026-10-17T07:30:00Z");
    expect(isOpenNow(week, TZ, null, sat0130)).toBe(false);
    // sábado 00:30 PERO sin turno overnight el viernes → cerrado
    const withoutFridayNight: WeekSchedule = { ...week, "5": { open: "13:00", close: "23:00", closed: false } };
    expect(isOpenNow(withoutFridayNight, TZ, null, sat0030)).toBe(false);
  });

  it("el turno overnight no abre antes de su apertura", () => {
    // viernes 00:30 local (06:30Z del viernes 16): el turno de viernes empieza 13:00
    const fri0030 = new Date("2026-10-16T06:30:00Z");
    expect(isOpenNow(week, TZ, null, fri0030)).toBe(false);
  });

  it("closed_until manda sobre todo el horario", () => {
    const closedUntil = "2026-10-13T00:00:00Z";
    expect(isOpenNow(week, TZ, closedUntil, mondayNoonUTC)).toBe(false);
    expect(isOpenNow(week, TZ, "2026-10-11T00:00:00Z", mondayNoonUTC)).toBe(true);
  });

  it("usa la zona horaria del restaurante (no la del server)", () => {
    // 10:00 en Tokio = 22:00 del día anterior en México → cerrado en MX
    const tokyoMorning = new Date("2026-10-12T01:00:00Z"); // 10:00 JST, 19:00 del 11 en MX (domingo)
    expect(isOpenNow(week, "Asia/Tokyo", null, tokyoMorning)).toBe(false); // lunes 10:00 JST < 11:00
    expect(isOpenNow(week, TZ, null, tokyoMorning)).toBe(true); // domingo 19:00 MX, abierto
  });

  it("schedule nulo se toma como abierto (fail-safe)", () => {
    expect(isOpenNow(null, TZ, null, mondayNoonUTC)).toBe(true);
  });
});

describe("nextOpeningText", () => {
  it("muestra la próxima apertura del mismo día", () => {
    // lunes 10:00 MX → abre a las 11:00 hoy
    expect(nextOpeningText(week, TZ, null, monday10amUTC)).toBe("hoy a las 11:00");
  });

  it("salta al siguiente día cuando ya pasó la apertura", () => {
    // lunes 22:00 MX (04:00Z del martes) → cierra 21:00 → "mañana a las 11:00"
    const monday22 = new Date("2026-10-13T04:00:00Z");
    expect(nextOpeningText(week, TZ, null, monday22)).toBe("mañana a las 11:00");
  });

  it("usa el nombre del día cuando es más de un día", () => {
    // lunes 22:00 con martes cerrado → "el miércoles a las 11:00"
    const closedTuesday: WeekSchedule = { ...week, "2": { open: "11:00", close: "21:00", closed: true } };
    const monday22 = new Date("2026-10-13T04:00:00Z");
    expect(nextOpeningText(closedTuesday, TZ, null, monday22)).toBe("el miércoles a las 11:00");
  });

  it("con closed_until futuro, cuenta desde la reapertura", () => {
    // cierre hasta el martes 12:00 MX (a media jornada del martes 11:00–21:00):
    // al terminar el cierre ya están en jornada → "hoy"
    const closedUntil = "2026-10-13T18:00:00Z";
    expect(nextOpeningText(week, TZ, closedUntil, monday10amUTC)).toBe("hoy");

    // cierre hasta el martes 22:00 MX (jornada del martes ya pasó) → "mañana"
    const closedUntilNight = "2026-10-14T04:00:00Z";
    expect(nextOpeningText(week, TZ, closedUntilNight, monday10amUTC)).toBe("mañana a las 11:00");
  });
});
