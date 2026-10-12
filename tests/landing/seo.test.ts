import { describe, it, expect } from "vitest";
import {
  buildSiteMetadata,
  buildRestaurantJsonLd,
  FALLBACK_NAME,
  FALLBACK_DESCRIPTION,
} from "@/lib/seo";

const BASE = "https://demo.example";

// Identidad arbitraria de un negocio cualquiera (white-label: nada del repo).
const fullConfig = {
  name: "Sabor Local",
  slogan: "Comida casera, todos los días.",
  logo_url: "https://cdn.example.com/logo.jpg",
  phone: "+52 5512345678",
  address: "Av. Central 123, Ciudad de México, CDMX",
};

describe("buildSiteMetadata", () => {
  it("usa la identidad de config (title, description, OG image = logo)", () => {
    const md = buildSiteMetadata(fullConfig, BASE);
    expect(md.title).toBe("Sabor Local");
    expect(md.description).toBe("Comida casera, todos los días.");
    expect(JSON.stringify(md.openGraph)).toContain("https://cdn.example.com/logo.jpg");
  });

  it("cae a defaults cuando la config está vacía", () => {
    const md = buildSiteMetadata({}, BASE);
    expect(md.title).toBe(FALLBACK_NAME);
    expect(md.description).toBe(FALLBACK_DESCRIPTION);
    expect(JSON.stringify(md.openGraph)).toContain("/icon.svg");
  });
});

describe("buildRestaurantJsonLd", () => {
  it("publica los datos reales de config, sin ciudad/geo inventados", () => {
    const ld = buildRestaurantJsonLd(fullConfig, BASE);
    const raw = JSON.stringify(ld);
    expect(ld.name).toBe("Sabor Local");
    expect(ld.telephone).toBe("+52 5512345678");
    expect(ld.address?.streetAddress).toContain("Av. Central 123");
    expect(ld.image).toBe("https://cdn.example.com/logo.jpg");
    expect(raw).not.toContain("geo");
  });

  it("sin config omite teléfono/dirección y usa el icono local", () => {
    const ld = buildRestaurantJsonLd({}, BASE);
    expect(ld.name).toBe(FALLBACK_NAME);
    expect(ld.telephone).toBeUndefined();
    expect(ld.address).toBeUndefined();
    expect(ld.image).toBe(`${BASE}/icon.svg`);
  });

  it("config parcial (solo nombre): teléfono/dirección ausentes, slogan de fallback", () => {
    const ld = buildRestaurantJsonLd({ name: "Otro Resto" }, BASE);
    expect(ld.name).toBe("Otro Resto");
    expect(ld.description).toBe(FALLBACK_DESCRIPTION);
    expect(ld.telephone).toBeUndefined();
    expect(ld.address).toBeUndefined();
  });
});
