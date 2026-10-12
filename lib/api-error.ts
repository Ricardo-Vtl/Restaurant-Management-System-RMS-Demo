import { ZodError } from "zod";
import { NextResponse } from "next/server";

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({
      error: "Datos inválidos",
      details: err.errors.map((e) => ({ message: e.message })),
    }, { status: 400 });
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  console.error("[API Error]", err);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
