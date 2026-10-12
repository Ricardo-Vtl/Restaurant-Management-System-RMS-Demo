import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  configSchema,
  configUpdateSchema,
  heroSlideSchema,
  scheduleSchema,
  channelsSchema,
} from "@/lib/api-schemas";

const slide = {
  image_url: "https://x.supabase.co/storage/v1/object/public/restaurant-assets/hero/a.png",
  title: "Bienvenidos",
  subtitle: "Hecho en casa",
  description: "Comida preparada al momento",
};

describe("configSchema (módulo Config)", () => {
  it("back-compat Mesas: solo sillas_respaldo sigue siendo válido", () => {
    expect(configSchema.safeParse({ sillas_respaldo: 4 }).success).toBe(true);
  });

  it("back-compat contrato de use-restaurant-config (fila parcial + strip)", () => {
    const hookSchema = configSchema.extend({ id: z.string() }).strip();
    const r = hookSchema.safeParse({
      id: "27168df1-60da-40a9-b051-52b7e52459f0",
      sillas_respaldo: 4,
      total_mesas: 8,
      total_sillas: 36,
      created_at: "2026-10-09T00:00:00Z",
    });
    expect(r.success).toBe(true);
  });

  it("strict: rechaza campos desconocidos", () => {
    expect(configSchema.safeParse({ sillas_respaldo: 4, huecos: 1 }).success).toBe(false);
  });

  it("impuestos: tasa dentro de 0..1", () => {
    expect(configSchema.safeParse({ sillas_respaldo: 4, tax_rate: 0.16 }).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, tax_rate: 1.16 }).success).toBe(false);
    expect(configSchema.safeParse({ sillas_respaldo: 4, tax_rate: -0.01 }).success).toBe(false);
  });

  it("timezone valida IANA real", () => {
    expect(configSchema.safeParse({ sillas_respaldo: 4, timezone: "America/Mexico_City" }).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, timezone: "Marte/Olympus" }).success).toBe(false);
  });

  it("whatsapp solo dígitos (formato wa.me)", () => {
    expect(configSchema.safeParse({ sillas_respaldo: 4, whatsapp_number: "521234567890" }).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, whatsapp_number: "+52 5512345678" }).success).toBe(false);
  });

  it("colores de marca en hex", () => {
    expect(configSchema.safeParse({ sillas_respaldo: 4, brand_colors: { primary: "#011c37", accent: "#d43a3a" } }).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, brand_colors: { primary: "navy", accent: "#d43a3a" } }).success).toBe(false);
  });

  it("hero_slides: máximo 8 y slide completo", () => {
    const slides = Array.from({ length: 8 }, (_, i) => ({ ...slide, title: `S${i}` }));
    expect(heroSlideSchema.safeParse(slide).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, hero_slides: slides }).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, hero_slides: [...slides, slide] }).success).toBe(false);
    expect(heroSlideSchema.safeParse({ ...slide, title: "" }).success).toBe(false);
    expect(heroSlideSchema.safeParse({ ...slide, image_url: "no-es-url" }).success).toBe(false);
    expect(heroSlideSchema.parse({ image_url: slide.image_url, title: "Solo título" })).toEqual({
      image_url: slide.image_url,
      title: "Solo título",
    });
  });

  it("ops: verde < amarillo y enteros", () => {
    expect(configSchema.safeParse({ sillas_respaldo: 4, ops: { sla_green_min: 5, sla_yellow_min: 15, caja_window_hours: 48 } }).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, ops: { sla_green_min: 15, sla_yellow_min: 5, caja_window_hours: 48 } }).success).toBe(false);
    expect(configSchema.safeParse({ sillas_respaldo: 4, ops: { sla_green_min: 5.5, sla_yellow_min: 15, caja_window_hours: 48 } }).success).toBe(false);
  });
});

describe("scheduleSchema (horarios)", () => {
  it("acepta 7 días con HH:mm y día cerrado", () => {
    const r = scheduleSchema.safeParse({
      "1": { open: "11:00", close: "21:00", closed: false },
      "6": { open: "12:00", close: "23:30", closed: false },
      "0": { open: "11:00", close: "21:00", closed: true },
    });
    expect(r.success).toBe(true);
  });

  it("días ausentes = cerrado (sin exigir los 7)", () => {
    expect(scheduleSchema.safeParse({}).success).toBe(true);
  });

  it("cruce de medianoche permitido (close < open)", () => {
    expect(scheduleSchema.safeParse({ "5": { open: "13:00", close: "01:00", closed: false } }).success).toBe(true);
  });

  it("rechaza open == close y horas inválidas", () => {
    expect(scheduleSchema.safeParse({ "1": { open: "11:00", close: "11:00", closed: false } }).success).toBe(false);
    expect(scheduleSchema.safeParse({ "1": { open: "11:00", close: "11:00", closed: true } }).success).toBe(true);
    expect(scheduleSchema.safeParse({ "1": { open: "25:00", close: "21:00", closed: false } }).success).toBe(false);
    expect(scheduleSchema.safeParse({ "7": { open: "11:00", close: "21:00", closed: false } }).success).toBe(false);
  });
});

describe("channelsSchema (canales)", () => {
  it("acepta canales con defaults", () => {
    const r = channelsSchema.safeParse({ delivery: { enabled: true } });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.delivery).toEqual({ enabled: true, eta_text: "", min_order: 0, fee: 0 });
  });

  it("rechaza montos negativos", () => {
    expect(channelsSchema.safeParse({ pickup: { enabled: true, min_order: -1 } }).success).toBe(false);
    expect(channelsSchema.safeParse({ pickup: { enabled: true, fee: -5 } }).success).toBe(false);
  });
});

describe("contacto y redes (configSchema)", () => {
  it("socials: acepta URLs válidas y rechaza inválidas", () => {
    expect(
      configSchema.safeParse({ sillas_respaldo: 4, socials: { instagram: "https://instagram.com/demo" } }).success,
    ).toBe(true);
    expect(
      configSchema.safeParse({
        sillas_respaldo: 4,
        socials: { facebook: "https://facebook.com/demo", tiktok: "https://tiktok.com/@demo" },
      }).success,
    ).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, socials: { instagram: "instagram.com/demo" } }).success).toBe(
      false,
    );
  });

  it("maps_embed_url: exige URL, acepta null y cadena vacía no pasa (se normaliza en el form)", () => {
    expect(
      configSchema.safeParse({
        sillas_respaldo: 4,
        maps_embed_url: "https://www.google.com/maps?q=cdmx&output=embed",
      }).success,
    ).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, maps_embed_url: null }).success).toBe(true);
    expect(configSchema.safeParse({ sillas_respaldo: 4, maps_embed_url: "no-es-url" }).success).toBe(false);
    expect(configSchema.safeParse({ sillas_respaldo: 4, maps_embed_url: "" }).success).toBe(false);
  });
});

describe("configUpdateSchema (PATCH)", () => {
  const id = "27168df1-60da-40a9-b051-52b7e52459f0";

  it("back-compat Mesas: updates solo de sillas_respaldo", () => {
    expect(configUpdateSchema.safeParse({ filters: { id }, updates: { sillas_respaldo: 6 } }).success).toBe(true);
    expect(configUpdateSchema.safeParse({ filters: { id }, updates: { total_sillas: 40 } }).success).toBe(true);
  });

  it("acepta updates del módulo Config", () => {
    expect(
      configUpdateSchema.safeParse({
        filters: { id },
        updates: { name: "Otro Local", hero_slides: [slide], web_orders_enabled: false },
      }).success,
    ).toBe(true);
  });

  it("exige al menos un filtro y rechaza updates desconocidos", () => {
    expect(configUpdateSchema.safeParse({ filters: {}, updates: { name: "X" } }).success).toBe(false);
    expect(configUpdateSchema.safeParse({ filters: { id }, updates: { inventado: 1 } }).success).toBe(false);
    expect(configUpdateSchema.safeParse({ filters: { id: "no-uuid" }, updates: { name: "X" } }).success).toBe(false);
  });
});
