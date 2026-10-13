import { describe, expect, it } from "vitest";
import { substitute } from "@/components/demo/target-matcher";

describe("target-matcher", () => {
  it("substitute reemplaza §table con el número de la sesión", () => {
    expect(substitute("Mesa §table", { table: "7" })).toBe("Mesa 7");
    expect(substitute("Este en Mesa §table.", { table: "12" })).toBe("Este en Mesa 12.");
  });

  it("substitute deja el texto sin cambios si no hay mesa", () => {
    expect(substitute("Mesa §table", {})).toBe("Mesa ");
    expect(substitute("Confirmar", { table: "3" })).toBe("Confirmar");
  });
});
