import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { ABILITIES } from "@/lib/abilities";
import { getImageInfo, type ImageMime } from "@/lib/image-dimensions";

const BUCKET = "restaurant-assets";

const KIND_RULES = {
  hero: { maxBytes: 3 * 1024 * 1024, minWidth: 1200, minHeight: 675 },
  logo: { maxBytes: 1024 * 1024, minWidth: 64, minHeight: 64 },
} as const;

const EXT_BY_MIME: Record<ImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  const auth = await requireRole(req, ...ABILITIES["config:manage"]);
  if (auth.error) return auth.error;

  try {
    const form = await req.formData();
    const kind = form.get("kind");
    const file = form.get("file");

    if (typeof kind !== "string" || !(kind in KIND_RULES)) {
      return NextResponse.json({ error: "Tipo de recurso inválido (usa kind=hero o kind=logo)" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const rules = KIND_RULES[kind as keyof typeof KIND_RULES];

    if (file.size > rules.maxBytes) {
      const mb = (rules.maxBytes / (1024 * 1024)).toFixed(0);
      return NextResponse.json({ error: `La imagen no debe pesar más de ${mb} MB` }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = getImageInfo(bytes);
    if (!info) {
      return NextResponse.json(
        { error: "Formato de imagen no soportado (usa JPEG, PNG o WebP)" },
        { status: 400 },
      );
    }

    if (info.width < rules.minWidth || info.height < rules.minHeight) {
      return NextResponse.json(
        {
          error: `La imagen mide ${info.width}×${info.height}px; el mínimo es ${rules.minWidth}×${rules.minHeight}px`,
        },
        { status: 400 },
      );
    }

    const path = `${kind}/${crypto.randomUUID()}.${EXT_BY_MIME[info.mime]}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: info.mime, upsert: false });

    if (uploadError) {
      console.error("[upload] Error subiendo a storage:", uploadError);
      return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json(
      { url: data.publicUrl, width: info.width, height: info.height, mime: info.mime },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
