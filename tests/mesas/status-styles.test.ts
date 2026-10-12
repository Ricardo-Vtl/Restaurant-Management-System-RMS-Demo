import { describe, it, expect } from "vitest";
import { statusStyles } from "@/app/gestion/mesas/_utils/status-styles";

describe("statusStyles", () => {
  it("tiene entrada para los 5 status de mesa (free, occupied, billing, reserved, closed)", () => {
    const keys = Object.keys(statusStyles);
    expect(keys).toHaveLength(5);
    expect(keys.sort()).toEqual(["billing", "closed", "free", "occupied", "reserved"].sort());
  });

  it("cada valor es un string CSS no vacío", () => {
    for (const [status, className] of Object.entries(statusStyles)) {
      expect(typeof className).toBe("string");
      expect(className.length).toBeGreaterThan(0);
    }
  });
});
