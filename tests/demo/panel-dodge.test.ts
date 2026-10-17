import { describe, expect, it } from "vitest";
import {
  PANEL_DODGE_GAP_PX,
  PANEL_DODGE_TOP_MARGIN_PX,
  computePanelDodgeY,
} from "@/components/demo/panel-dodge";

// Panel pegado abajo a la derecha (caso real: lg:bottom-24 lg:right-6, w-96).
const panel = { top: 502, left: 872, right: 1256, bottom: 804 };

describe("panel-dodge", () => {
  it("no aparta el panel si el objetivo no se solapa", () => {
    // Objetivo a la izquierda del panel (misma franja vertical).
    expect(
      computePanelDodgeY({ target: { top: 516, left: 466, right: 814, bottom: 576 }, panel }),
    ).toBe(0);
    // Objetivo por encima del panel.
    expect(
      computePanelDodgeY({ target: { top: 292, left: 274, right: 429, bottom: 480 }, panel }),
    ).toBe(0);
  });

  it("sube lo justo para dejar el aire sobre el objetivo (caso paso 10)", () => {
    // "Enviar a Cocina" a 1280x900: 299x68 en y=777, el panel termina en 804.
    const target = { top: 777, left: 939, right: 1238, bottom: 845 };
    // needed = 777 - 16 - 804 = -43; limit = min(0, 16 - 502) = -486 → -43.
    expect(computePanelDodgeY({ target, panel })).toBe(-43);
  });

  it("clava el panel en el margen superior si el objetivo no deja franja", () => {
    // Objetivo que arranca casi en el borde superior y se solapa con el panel.
    const target = { top: 20, left: 900, right: 1250, bottom: 900 };
    // needed = 20 - 16 - 804 = -800; limit = min(0, 16 - 502) = -486 → -486 (parcial).
    expect(computePanelDodgeY({ target, panel })).toBe(-486);
    expect(PANEL_DODGE_TOP_MARGIN_PX - panel.top).toBe(-486);
  });

  it("no intenta subir si el panel ya está en el margen superior", () => {
    const pegado = { ...panel, top: PANEL_DODGE_TOP_MARGIN_PX, bottom: 318 };
    expect(
      computePanelDodgeY({ target: { top: 300, left: 900, right: 1250, bottom: 900 }, panel: pegado }),
    ).toBe(0);
  });

  it("el aire configurado es el que deja el cálculo", () => {
    const target = { top: 700, left: 900, right: 1250, bottom: 900 };
    const y = computePanelDodgeY({ target, panel });
    expect(panel.bottom + y).toBe(target.top - PANEL_DODGE_GAP_PX);
  });
});
