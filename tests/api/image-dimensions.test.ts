import { describe, it, expect } from "vitest";
import { getImageInfo, sniffImageMime } from "@/lib/image-dimensions";

function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8); // len + "IHDR"
  b.set([width >>> 24, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff], 16);
  b.set([height >>> 24, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff], 20);
  return b;
}

function jpeg(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32);
  b.set([0xff, 0xd8], 0);
  // APP0 (no-SOF) para ejercitar el salto de segmentos
  b.set([0xff, 0xe0, 0x00, 0x10], 2);
  // SOF0 en i=20: marker + len(11) + precision + height + width
  b.set([0xff, 0xc0, 0x00, 0x0b, 0x08], 20);
  b.set([(height >> 8) & 0xff, height & 0xff], 25);
  b.set([(width >> 8) & 0xff, width & 0xff], 27);
  return b;
}

function webpVp8x(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  b.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  b.set([0x56, 0x50, 0x38, 0x58], 12); // VP8X
  const w = width - 1, h = height - 1;
  b.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24);
  b.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27);
  return b;
}

function webpVp8l(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46], 0);
  b.set([0x57, 0x45, 0x42, 0x50], 8);
  b.set([0x56, 0x50, 0x38, 0x4c], 12); // VP8L
  b[20] = 0x2f; // signature
  const w = width - 1, h = height - 1;
  b[21] = w & 0xff;
  b[22] = ((w >> 8) & 0x3f) | ((h & 0x3) << 6);
  b[23] = (h >> 2) & 0xff;
  b[24] = (h >> 10) & 0x0f;
  return b;
}

function webpVp8(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46], 0);
  b.set([0x57, 0x45, 0x42, 0x50], 8);
  b.set([0x56, 0x50, 0x38, 0x20], 12); // "VP8 "
  b.set([width & 0xff, (width >> 8) & 0xff], 26);
  b.set([height & 0xff, (height >> 8) & 0xff], 28);
  return b;
}

describe("getImageInfo (magic bytes)", () => {
  it("lee PNG (IHDR)", () => {
    expect(getImageInfo(png(1200, 675))).toEqual({ mime: "image/png", width: 1200, height: 675 });
  });

  it("lee JPEG saltando segmentos hasta SOF", () => {
    expect(getImageInfo(jpeg(1920, 1080))).toEqual({ mime: "image/jpeg", width: 1920, height: 1080 });
  });

  it("lee WebP VP8X (extendido)", () => {
    expect(getImageInfo(webpVp8x(1600, 900))).toEqual({ mime: "image/webp", width: 1600, height: 900 });
  });

  it("lee WebP VP8L (lossless, bit-packing)", () => {
    expect(getImageInfo(webpVp8l(1200, 675))).toEqual({ mime: "image/webp", width: 1200, height: 675 });
  });

  it("lee WebP VP8 (lossy)", () => {
    expect(getImageInfo(webpVp8(1280, 720))).toEqual({ mime: "image/webp", width: 1280, height: 720 });
  });

  it("devuelve null en formato desconocido o truncado", () => {
    expect(getImageInfo(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull(); // GIF
    expect(getImageInfo(new Uint8Array(0))).toBeNull();
    expect(getImageInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull(); // PNG sin IHDR
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0x00]))).toBeNull();
  });
});
