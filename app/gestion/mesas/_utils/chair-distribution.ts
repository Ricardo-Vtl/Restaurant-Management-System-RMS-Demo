import type { Table, MesaCascadePayload } from "@/lib/types";
import { rpcUpdateTableDistribution } from "@/lib/api-rpc";

export function redistribuirAumento(
  sillasNecesarias: number,
  respaldoActual: number,
  mesaId: string,
  allTables: Table[],
): { nuevoRespaldoBodega: number; mesasModificadasEnCascada: MesaCascadePayload[] } {
  let sillasPorConseguir = sillasNecesarias;
  let nuevoRespaldo = respaldoActual;

  if (sillasPorConseguir > 0 && nuevoRespaldo > 0) {
    const tomadasDeBodega = Math.min(sillasPorConseguir, nuevoRespaldo);
    sillasPorConseguir -= tomadasDeBodega;
    nuevoRespaldo -= tomadasDeBodega;
  }

  const mesasModificadas: MesaCascadePayload[] = [];

  if (sillasPorConseguir > 0) {
    const mesasLibresParaRobar = allTables
      .filter((t) => t.id !== mesaId && t.status === "free" && t.is_active !== false)
      .sort((a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }));

    for (const mesaLibre of mesasLibresParaRobar) {
      if (sillasPorConseguir <= 0) break;
      const disponibles = mesaLibre.capacity || 0;
      if (disponibles === 0) continue;
      const aRobar = Math.min(sillasPorConseguir, disponibles);
      sillasPorConseguir -= aRobar;
      mesasModificadas.push({
        id: mesaLibre.id,
        capacity: disponibles - aRobar,
        is_active: true,
      });
    }
  }

  if (sillasPorConseguir > 0) {
    throw new Error("No hay suficientes sillas en el local.");
  }

  return { nuevoRespaldoBodega: nuevoRespaldo, mesasModificadasEnCascada: mesasModificadas };
}

export function redistribuirReduccion(
  sillasALiberar: number,
  respaldoActual: number,
  mesaId: string,
  allTables: Table[],
): { nuevoRespaldoBodega: number; mesasModificadasEnCascada: MesaCascadePayload[] } {
  let sillasPendientes = sillasALiberar;
  let nuevoRespaldo = respaldoActual;
  const mesasModificadas: MesaCascadePayload[] = [];

  const mesasNecesitadas = allTables
    .filter((t) => t.id !== mesaId && t.status === "free" && (t.capacity || 0) < (t.base_seats || 0))
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  for (const mesaVecina of mesasNecesitadas) {
    if (sillasPendientes <= 0) break;
    const capActual = mesaVecina.capacity || 0;
    const capBase = mesaVecina.base_seats || 0;
    const aDonar = Math.min(sillasPendientes, capBase - capActual);
    sillasPendientes -= aDonar;
    mesasModificadas.push({
      id: mesaVecina.id,
      capacity: capActual + aDonar,
      is_active: capActual + aDonar > 0,
    });
  }

  if (sillasPendientes > 0) {
    nuevoRespaldo += sillasPendientes;
  }

  return { nuevoRespaldoBodega: nuevoRespaldo, mesasModificadasEnCascada: mesasModificadas };
}

interface RestitucionResult {
  mesasARestituir: MesaCascadePayload[];
  nuevoRespaldo: number;
  capacityFinalMesa: number;
}

export function calcularRestitucionMesas(
  todasLasMesas: Table[],
  mesaId: string,
  sillasBase: number,
  capacityOrigen: number,
  respaldoActual: number,
): RestitucionResult {
  const sillasExcedentes = Math.max(0, capacityOrigen - sillasBase);
  let porDistribuir = sillasExcedentes;
  let nuevoRespaldo = respaldoActual;
  const mesasARestituir: MesaCascadePayload[] = [];

  if (porDistribuir > 0) {
    // Solo mesas con deficit positivo: una inactiva con capacity >= base
    // (hija de join completa, soft-deleted) no debe tocarse ni reactivarse.
    const mesasIncompletas = todasLasMesas
      .filter((t) => t.id !== mesaId && t.status === "free" && (t.capacity || 0) < (t.base_seats || 0))
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

    for (const mesaIncompleta of mesasIncompletas) {
      if (porDistribuir <= 0) break;
      const faltaParaLlenar = (mesaIncompleta.base_seats || 0) - (mesaIncompleta.capacity || 0);
      if (faltaParaLlenar <= 0) continue;
      const aDevolver = Math.min(porDistribuir, faltaParaLlenar);
      porDistribuir -= aDevolver;
      const nuevaCapacidad = (mesaIncompleta.capacity || 0) + aDevolver;
      mesasARestituir.push({ id: mesaIncompleta.id, capacity: nuevaCapacidad, is_active: nuevaCapacidad > 0 });
    }
  }

  if (porDistribuir > 0) {
    nuevoRespaldo += porDistribuir;
  }

  // Deficit de la mesa origen: se completa solo desde bodega. Si no alcanza,
  // la mesa queda con capacity parcial (pendiente) sin bloquear el checkout.
  const faltante = Math.max(0, sillasBase - capacityOrigen);
  const tomadoDeRespaldo = Math.min(faltante, nuevoRespaldo);
  nuevoRespaldo -= tomadoDeRespaldo;
  const capacityFinalMesa = Math.min(sillasBase, capacityOrigen + tomadoDeRespaldo);

  return { mesasARestituir, nuevoRespaldo, capacityFinalMesa };
}

export async function persistirRestitucion(
  mesaId: string,
  configId: string | null,
  { mesasARestituir, nuevoRespaldo, capacityFinalMesa }: RestitucionResult,
  section: string,
) {
  await rpcUpdateTableDistribution({
    tableId: mesaId,
    capacity: capacityFinalMesa,
    currentGuests: 0,
    section,
    cascade: mesasARestituir.map((m) => ({ id: m.id, capacity: m.capacity, is_active: m.is_active })),
    configId,
    sillasRespaldo: nuevoRespaldo,
  });
}
