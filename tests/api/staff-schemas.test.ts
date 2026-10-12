import { describe, it, expect } from "vitest";
import { staffCreateSchema, staffUpdateSchema } from "@/lib/api-schemas";
import { can } from "@/lib/abilities";

describe("staff schemas (módulo Personal)", () => {
  it("acepta alta válida", () => {
    const r = staffCreateSchema.safeParse({ name: "María López", role: "waiter", pin: "123456" });
    expect(r.success).toBe(true);
  });

  it("recorta el nombre y rechaza cortos", () => {
    expect(staffCreateSchema.parse({ name: "  Ana  ", role: "kitchen", pin: "000000" }).name).toBe("Ana");
    expect(staffCreateSchema.safeParse({ name: "A", role: "kitchen", pin: "000000" }).success).toBe(false);
  });

  it("PIN hereda la regla de login: exactamente 6 dígitos", () => {
    expect(staffCreateSchema.safeParse({ name: "Ana", role: "admin", pin: "12345" }).success).toBe(false);
    expect(staffCreateSchema.safeParse({ name: "Ana", role: "admin", pin: "1234567" }).success).toBe(false);
    expect(staffCreateSchema.safeParse({ name: "Ana", role: "admin", pin: "12a456" }).success).toBe(false);
  });

  it("rol restringido al enum vivo", () => {
    expect(staffCreateSchema.safeParse({ name: "Ana", role: "superadmin", pin: "123456" }).success).toBe(false);
  });

  it("strict: sin campos extra (ni auth_id ni auth_email desde el cliente)", () => {
    expect(
      staffCreateSchema.safeParse({ name: "Ana", role: "admin", pin: "123456", auth_id: "x" }).success,
    ).toBe(false);
  });

  it("update exige id uuid y al menos un campo", () => {
    const id = "27168df1-60da-40a9-b051-52b7e52459f0";
    expect(staffUpdateSchema.safeParse({ id, updates: {} }).success).toBe(false);
    expect(staffUpdateSchema.safeParse({ id: "no-uuid", updates: { name: "Ana" } }).success).toBe(false);
    expect(staffUpdateSchema.safeParse({ id, updates: { is_active: false } }).success).toBe(true);
  });

  it("update permite reset de PIN y rechaza PIN inválido", () => {
    const id = "27168df1-60da-40a9-b051-52b7e52459f0";
    expect(staffUpdateSchema.safeParse({ id, updates: { pin: "654321" } }).success).toBe(true);
    expect(staffUpdateSchema.safeParse({ id, updates: { pin: "abc" } }).success).toBe(false);
  });
});

describe("staff:manage ability", () => {
  it("solo admin gestiona personal", () => {
    expect(can("admin", "staff:manage")).toBe(true);
    expect(can("cashier", "staff:manage")).toBe(false);
    expect(can("waiter", "staff:manage")).toBe(false);
    expect(can("kitchen", "staff:manage")).toBe(false);
  });
});
