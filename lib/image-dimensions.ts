// Lector de dimensiones y MIME por magic bytes (PNG / JPEG / WebP).
// Validación server-side en el trust boundary del upload — sin dependencias.
// Devuelve null ante formato desconocido o bytes insuficientes.

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export interface ImageInfo {
  mime: ImageMime;
  width: number;
  height: number;
}

export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

export function getImageInfo(bytes: Uint8Array): ImageInfo | null {
  const mime = sniffImageMime(bytes);
  if (!mime) return null;

  const dims =
    mime === "image/png" ? readPng(bytes) :
    mime === "image/jpeg" ? readJpeg(bytes) :
    readWebp(bytes);
  if (!dims) return null;

  return { mime, width: dims.width, height: dims.height };
}

function readPng(b: Uint8Array): { width: number; height: number } | null {
  // IHDR es el primer chunk: longitud(4) + "IHDR"(4) + width(4 BE) + height(4 BE)
  if (b.length < 24) return null;
  return { width: be32(b, 16), height: be32(b, 20) };
}

function readJpeg(b: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    // SOFn (sin DHT/JPG/DAC): C0-C3, C5-C7, C9-CB, CD-CF
    const isSof = marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2) return null;
    if (isSof) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + length;
  }
  return null;
}

function readWebp(b: Uint8Array): { width: number; height: number } | null {
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === "VP8X") {
    if (b.length < 30) return null;
    return { width: le24(b, 24) + 1, height: le24(b, 27) + 1 };
  }
  if (chunk === "VP8 ") {
    // frame tag(3) + start code 9D 01 2A + width(u16le & 0x3FFF) + height(u16le & 0x3FFF)
    if (b.length < 30) return null;
    return {
      width: (b[26] | (b[27] << 8)) & 0x3fff,
      height: (b[28] | (b[29] << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    // signature 0x2F + 14 bits (width-1) + 14 bits (height-1)
    if (b.length < 25 || b[20] !== 0x2f) return null;
    return {
      width: (b[21] | ((b[22] & 0x3f) << 8)) + 1,
      height: (((b[22] >> 6) | (b[23] << 2)) | ((b[24] & 0x0f) << 10)) + 1,
    };
  }
  return null;
}

function be32(b: Uint8Array, i: number): number {
  return (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
}

function le24(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
}
