import { describe, it, expect } from "vitest";
import { ejecutarAlgoritmoDistribucion } from "@/app/gestion/mesas/_utils/distribution-algorithm";

function totalSillasEnReparto(reparto: { mesa: number; sillas: number }[]): number {
  return reparto.reduce((sum, m) => sum + m.sillas, 0);
}

describe("ejecutarAlgoritmoDistribucion", () => {
  describe("Escasez (mesas * sugerida > sillas disponibles)", () => {
    it("llena mesas secuencialmente cuando no alcanzan las sillas", () => {
      // 5 mesas, 15 sillas, 4 silla/mesa → se necesitan 20, solo hay 15
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(5, 15, 4, false);
      expect(respaldoCalculado).toBe(0);
      // Orden: completa las primeras 3 (4+4+4=12), 4ª con las 3 restantes, 5ª con 0
      expect(reparto[0].sillas).toBe(4);
      expect(reparto[1].sillas).toBe(4);
      expect(reparto[2].sillas).toBe(4);
      expect(reparto[3].sillas).toBe(3);
      expect(reparto[4].sillas).toBe(0);
      expect(totalSillasEnReparto(reparto)).toBe(15);
    });

    it("escasez severa: 3 mesas, 6 sillas, 4 silla/mesa", () => {
      const { reparto } = ejecutarAlgoritmoDistribucion(3, 6, 4, false);
      expect(reparto[0].sillas).toBe(4);
      expect(reparto[1].sillas).toBe(2);
      expect(reparto[2].sillas).toBe(0);
      expect(totalSillasEnReparto(reparto)).toBe(6);
    });

    it("escasez con 1 mesa y 2 sillas, 5 sugeridas", () => {
      const { reparto } = ejecutarAlgoritmoDistribucion(1, 2, 5, false);
      expect(reparto[0].sillas).toBe(2);
      expect(totalSillasEnReparto(reparto)).toBe(2);
    });

    it("invariante: total sillas distribuido = sillas disponibles en escasez", () => {
      const { reparto } = ejecutarAlgoritmoDistribucion(10, 37, 5, false);
      expect(totalSillasEnReparto(reparto)).toBe(37);
    });
  });

  describe("Excedente (sillas suficientes o sobran)", () => {
    it("todas las mesas reciben sillasSugeridas, respaldo = diferencia", () => {
      // 3 mesas, 18 sillas, 4 silla/mesa → se usan 12, sobran 6
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(3, 18, 4, false);
      expect(reparto.every((m) => m.sillas === 4)).toBe(true);
      expect(respaldoCalculado).toBe(6);
      expect(totalSillasEnReparto(reparto)).toBe(12);
    });

    it("excedente exacto: sillas = mesas * sugerida", () => {
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(4, 16, 4, false);
      expect(reparto.every((m) => m.sillas === 4)).toBe(true);
      expect(respaldoCalculado).toBe(0);
      expect(totalSillasEnReparto(reparto)).toBe(16);
    });
  });

  describe("Forzar reparto masivo", () => {
    it("distribuye sillas uniformemente entre mesas sin respaldo", () => {
      // 4 mesas, 20 sillas, 4 silla/mesa, forzar=true
      // Base: 4 c/u = 16, sobran 4. Extra: +1 c/u = 5 cada una
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(4, 20, 4, true);
      expect(reparto.every((m) => m.sillas === 5)).toBe(true);
      expect(respaldoCalculado).toBe(0);
      expect(totalSillasEnReparto(reparto)).toBe(20);
    });

    it("reparto con residuo: 3 mesas, 14 sillas, 4 silla/mesa", () => {
      // Base: 4 c/u = 12, sobran 2. Extra: +0 cada una (floor 2/3=0), residuo 2.
      // Residuo se distribuye: última mesa +1, penúltima +1
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(3, 14, 4, true);
      expect(reparto[0].sillas).toBe(4); // primera sin residuo
      expect(reparto[1].sillas).toBe(5); // penúltima +1
      expect(reparto[2].sillas).toBe(5); // última +1
      expect(respaldoCalculado).toBe(0);
      expect(totalSillasEnReparto(reparto)).toBe(14);
    });

    it("reparto con extra grande: 2 mesas, 20 sillas, 4 silla/mesa", () => {
      // Base: 8, sobran 12. Extra: +6 c/u = 10 cada una
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(2, 20, 4, true);
      expect(reparto[0].sillas).toBe(10);
      expect(reparto[1].sillas).toBe(10);
      expect(respaldoCalculado).toBe(0);
      expect(totalSillasEnReparto(reparto)).toBe(20);
    });

    it("forzar sin excedente: no cambia nada", () => {
      // 3 mesas, 12 sillas, 4 silla/mesa → excedente 0
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(3, 12, 4, true);
      expect(reparto.every((m) => m.sillas === 4)).toBe(true);
      expect(respaldoCalculado).toBe(0);
    });

    it("invariante: total sillas se conserva con forzar=true", () => {
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(7, 50, 5, true);
      expect(totalSillasEnReparto(reparto) + respaldoCalculado).toBe(50);
    });
  });

  describe("Edge cases y sanitización", () => {
    it("0 mesas se convierte en 1 (Math.max)", () => {
      const { reparto } = ejecutarAlgoritmoDistribucion(0, 10, 4, false);
      expect(reparto).toHaveLength(1);
    });

    it("0 sillas → todas las mesas con 0, respaldo 0", () => {
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(5, 0, 4, false);
      expect(reparto.every((m) => m.sillas === 0)).toBe(true);
      expect(respaldoCalculado).toBe(0);
    });

    it("sillasSugeridas 0 → se usa 0, no hay excedente", () => {
      const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(3, 15, 0, false);
      expect(reparto.every((m) => m.sillas === 0)).toBe(true);
      expect(respaldoCalculado).toBe(15);
    });

    it("valores negativos sanitizados a 0/1", () => {
      const { reparto } = ejecutarAlgoritmoDistribucion(-3, -10, -2, false);
      expect(reparto).toHaveLength(1); // Math.max(1, -3) = 1
      expect(reparto[0].sillas).toBe(0); // totalSillas = 0, todo en escasez
    });
  });

  describe("Invariante global: sillas distribuidas + respaldo = sillas totales", () => {
    const casos = [
      [5, 20, 4, false],
      [5, 20, 4, true],
      [3, 10, 5, false],
      [3, 10, 5, true],
      [8, 100, 6, false],
      [8, 100, 6, true],
      [10, 37, 5, false],
      [10, 37, 5, true],
    ] as const;

    it.each(casos)(
      "mesas=%i, sillas=%i, sugerida=%i, forzar=%s",
      (mesas, sillas, sugerida, forzar) => {
        const { reparto, respaldoCalculado } = ejecutarAlgoritmoDistribucion(mesas, sillas, sugerida, forzar);
        expect(totalSillasEnReparto(reparto) + respaldoCalculado).toBe(
          Math.max(0, Math.floor(Number(sillas) || 0)),
        );
      },
    );
  });
});
