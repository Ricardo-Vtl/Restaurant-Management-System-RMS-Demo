import { describe, it, expect } from "vitest";
import {
  redistribuirAumento,
  redistribuirReduccion,
  calcularRestitucionMesas,
} from "@/app/gestion/mesas/_utils/chair-distribution";
import type { Table, MesaCascadePayload } from "@/lib/types";

const UUID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

function makeTable(overrides: Partial<Table> & { id: string }): Table {
  return {
    number: "1",
    capacity: 4,
    base_seats: 4,
    currentGuests: null,
    status: "free",
    is_active: true,
    section: "General",
    isJoined: false,
    joinedTableIds: [],
    totalCuenta: 0,
    ...overrides,
  };
}

interface SystemState {
  tables: Table[];
  respaldo: number;
}

function totalSillas(state: SystemState): number {
  return state.tables.reduce((sum, t) => sum + t.capacity, 0) + state.respaldo;
}

function applyAumento(state: SystemState, mesaId: string, sillasNecesarias: number): SystemState {
  const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirAumento(
    sillasNecesarias,
    state.respaldo,
    mesaId,
    state.tables,
  );
  return {
    tables: state.tables.map((t) => {
      if (t.id === mesaId) return { ...t, capacity: t.capacity + sillasNecesarias };
      const mod = mesasModificadasEnCascada.find((p) => p.id === t.id);
      if (mod) return { ...t, capacity: mod.capacity, is_active: mod.is_active };
      return { ...t };
    }),
    respaldo: nuevoRespaldoBodega,
  };
}

function applyReduccion(state: SystemState, mesaId: string, sillasALiberar: number): SystemState {
  const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(
    sillasALiberar,
    state.respaldo,
    mesaId,
    state.tables,
  );
  return {
    tables: state.tables.map((t) => {
      if (t.id === mesaId) return { ...t, capacity: t.capacity - sillasALiberar };
      const mod = mesasModificadasEnCascada.find((p) => p.id === t.id);
      if (mod) return { ...t, capacity: mod.capacity, is_active: mod.is_active };
      return { ...t };
    }),
    respaldo: nuevoRespaldoBodega,
  };
}

function applyRestitucion(
  state: SystemState,
  mesaId: string,
  sillasBase: number,
  sillasExcedentes: number,
): SystemState {
  const { mesasARestituir, nuevoRespaldo, capacityFinalMesa } = calcularRestitucionMesas(
    state.tables,
    mesaId,
    sillasBase,
    sillasBase + sillasExcedentes,
    state.respaldo,
  );
  return {
    tables: state.tables.map((t) => {
      if (t.id === mesaId) return { ...t, capacity: capacityFinalMesa, status: "free" as const };
      const mod = mesasARestituir.find((p) => p.id === t.id);
      if (mod) return { ...t, capacity: mod.capacity, is_active: mod.is_active };
      return { ...t };
    }),
    respaldo: nuevoRespaldo,
  };
}

function getMesa(state: SystemState, id: string): Table {
  return state.tables.find((t) => t.id === id)!;
}

// =============================================================================
// FLUJO A: Configurar → Abrir → Gestionar → Cerrar (config básica)
// =============================================================================
describe("Flujo A: Configurar → Abrir → Gestionar → Cerrar", () => {
  it("flujo completo con invariante consistente en cada paso", () => {
    // Paso 1: Configuración inicial: 5 mesas, 25 sillas, 4 silla/mesa
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(3), number: "3", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(4), number: "4", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(5), number: "5", capacity: 4, base_seats: 4 }),
      ],
      respaldo: 5, // 25 - (5*4) = 5
    };
    const totalPre = totalSillas(state);
    expect(totalPre).toBe(25);
    state.tables.forEach((t) => expect(t.capacity).toBe(4));

    // Paso 2: Abrir mesa #1 con 6 guests (necesita 2 más)
    state = applyAumento(state, UUID(1), 2);
    expect(getMesa(state, UUID(1)).capacity).toBe(6);
    expect(state.respaldo).toBe(3); // 5-2=3
    expect(totalSillas(state)).toBe(totalPre);

    // Paso 3: Abrir mesa #2 con 4 guests (capacity justa, no necesita cambios)
    state = applyAumento(state, UUID(2), 0);
    expect(getMesa(state, UUID(2)).capacity).toBe(4);
    expect(state.respaldo).toBe(3); // sin cambios
    expect(totalSillas(state)).toBe(totalPre);

    // Paso 4: Gestionar mesa #1: aumentar de 6→8 guests (necesita 2 más)
    state = applyAumento(state, UUID(1), 2);
    expect(getMesa(state, UUID(1)).capacity).toBe(8);
    expect(state.respaldo).toBe(1); // 3-2=1
    expect(totalSillas(state)).toBe(totalPre);

    // Paso 5: Cerrar mesa #1: libera 4 excedentes (capacity=8, base=4)
    state = applyRestitucion(state, UUID(1), 4, 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(4);
    expect(getMesa(state, UUID(1)).status).toBe("free");
    // 4 excedentes van a respaldo (no hay mesas incompletas)
    expect(state.respaldo).toBe(5); // 1+4=5
    expect(totalSillas(state)).toBe(totalPre);

    // Verificar estado final: igual al inicial
    state.tables.forEach((t) => expect(t.capacity).toBe(4));
    expect(state.respaldo).toBe(5);
  });
});

// =============================================================================
// FLUJO B: Escasez de sillas (robo entre mesas)
// =============================================================================
describe("Flujo B: Escasez de sillas (robo entre mesas)", () => {
  it("abrir mesa grande cuando no hay respaldo, luego cerrar y restaurar", () => {
    // Config: 3 mesas, 12 sillas, 4 silla/mesa, respaldo=0
    // #1 (num="1"), #2 (num="3"), #3 (num="2")
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(2), number: "3", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(3), number: "2", capacity: 4, base_seats: 4 }),
      ],
      respaldo: 0,
    };
    const totalPre = totalSillas(state);
    expect(totalPre).toBe(12);

    // Abrir mesa #1 con 8 guests (necesita 4, respaldo=0)
    // Mesas robables libres: #2 (num="3"), #3 (num="2")
    // Orden descendente: #2 (num="3") primero — tiene 4 sillas, necesita 4 → las toma todas
    // #2 capacity: 4→0, #3 no se toca
    state = applyAumento(state, UUID(1), 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(8);
    expect(getMesa(state, UUID(2)).capacity).toBe(0); // prestó 4 completas
    expect(getMesa(state, UUID(2)).is_active).toBe(true);
    expect(getMesa(state, UUID(3)).capacity).toBe(4); // no se tocó
    expect(state.respaldo).toBe(0);
    expect(totalSillas(state)).toBe(totalPre);

    // Cerrar mesa #1: libera 4 excedentes (8→4)
    // Distribución: #2 necesita 4 (cap=0, base=4) → recibe 4 completas
    // #3 está completa (cap=4, base=4) → 0
    state = applyRestitucion(state, UUID(1), 4, 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(4);
    expect(getMesa(state, UUID(2)).capacity).toBe(4); // restituido a base
    expect(getMesa(state, UUID(2)).is_active).toBe(true);
    expect(getMesa(state, UUID(3)).capacity).toBe(4); // nunca cambió
    expect(state.respaldo).toBe(0);
    expect(totalSillas(state)).toBe(totalPre);

    // Estado final = estado inicial
    state.tables.forEach((t) => expect(t.capacity).toBe(4));
  });
});

// =============================================================================
// FLUJO C: Reducción con distribución inteligente
// =============================================================================
describe("Flujo C: Reducción con distribución inteligente durante servicio", () => {
  it("aumenta, reduce en caliente, cierra, todo consistente", () => {
    // Config: 4 mesas, 20 sillas, 4 silla/mesa, respaldo=4
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(3), number: "3", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(4), number: "4", capacity: 4, base_seats: 4 }),
      ],
      respaldo: 4,
    };
    const totalPre = totalSillas(state);

    // Abrir mesa #1 con 8 guests (necesita 4) → toma de respaldo
    state = applyAumento(state, UUID(1), 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(8);
    expect(state.respaldo).toBe(0);
    expect(totalSillas(state)).toBe(totalPre);

    // Abrir mesa #2 con 8 guests (necesita 4) → respaldo=0, roba de la mesa
    // libre de mayor número: #4 (num="4") tiene 4 → se las da todas
    state = applyAumento(state, UUID(2), 4);
    expect(getMesa(state, UUID(2)).capacity).toBe(8);
    expect(getMesa(state, UUID(3)).capacity).toBe(4); // no se tocó
    expect(getMesa(state, UUID(4)).capacity).toBe(0); // prestó 4
    expect(getMesa(state, UUID(4)).is_active).toBe(true);
    expect(state.respaldo).toBe(0);
    expect(totalSillas(state)).toBe(totalPre);

    // Reducir mesa #1 de 8→4 guests (libera 4)
    // Incompleta: #4 (cap=0, base=4, deficit=4) → recibe las 4
    state = applyReduccion(state, UUID(1), 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(4);
    expect(getMesa(state, UUID(4)).capacity).toBe(4); // restituido
    expect(getMesa(state, UUID(4)).is_active).toBe(true);
    expect(state.respaldo).toBe(0); // nada a respaldo
    expect(totalSillas(state)).toBe(totalPre);

    // Cerrar mesa #2: libera 4 (8→4), todas completas → a respaldo
    state = applyRestitucion(state, UUID(2), 4, 4);
    expect(getMesa(state, UUID(2)).capacity).toBe(4);
    expect(state.respaldo).toBe(4);
    expect(totalSillas(state)).toBe(totalPre);

    // Estado final = estado inicial
    state.tables.forEach((t) => expect(t.capacity).toBe(4));
    expect(state.respaldo).toBe(4);
  });
});

// =============================================================================
// FLUJO D: Reducción con distribución parcial + respaldo
// =============================================================================
describe("Flujo D: Reducción con distribución parcial + respaldo", () => {
  it("reduce guests y distribuye excedente entre mesas incompletas y respaldo", () => {
    // Config: 3 mesas
    // Mesa #1: capacity=8, base=4 → usada
    // Mesa #2: capacity=2, base=4 → incompleta
    // Mesa #3: capacity=3, base=4 → incompleta
    // Respaldo=1
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4 }),
        makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4 }),
        makeTable({ id: UUID(3), number: "3", capacity: 3, base_seats: 4 }),
      ],
      respaldo: 1,
    };
    const totalPre = totalSillas(state); // 8+2+3+1=14

    // Reducir mesa #1 de 8→4 guests (libera 4)
    // #2 necesita 2, #3 necesita 1 → se distribuyen 3, sobra 1 a respaldo
    state = applyReduccion(state, UUID(1), 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(4);
    expect(getMesa(state, UUID(2)).capacity).toBe(4); // +2, completa
    expect(getMesa(state, UUID(3)).capacity).toBe(4); // +1, completa
    expect(state.respaldo).toBe(2); // 1+1=2
    expect(totalSillas(state)).toBe(totalPre);
  });
});

// =============================================================================
// FLUJO E: Forzar reparto masivo + ciclo completo
// =============================================================================
describe("Flujo E: Reparto masivo + operaciones", () => {
  it("configura con forzar, opera normalmente, consistencia se mantiene", () => {
    // Forzar reparto: 4 mesas, 24 sillas → 6 c/u, respaldo=0
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 6, base_seats: 6 }),
        makeTable({ id: UUID(2), number: "2", capacity: 6, base_seats: 6 }),
        makeTable({ id: UUID(3), number: "3", capacity: 6, base_seats: 6 }),
        makeTable({ id: UUID(4), number: "4", capacity: 6, base_seats: 6 }),
      ],
      respaldo: 0,
    };
    const totalPre = totalSillas(state);
    expect(totalPre).toBe(24);

    // Abrir mesa #1 con +4 guests (6→10), respaldo=0
    // Robables: #4 (num="4", cap=6) → da 4 (6→2)
    state = applyAumento(state, UUID(1), 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(10);
    expect(getMesa(state, UUID(4)).capacity).toBe(2);
    expect(state.respaldo).toBe(0);
    expect(totalSillas(state)).toBe(totalPre);

    // Cerrar mesa #1: sillasBase=6 (base_seats), sillasExcedentes=4 (10-6)
    // calcularRestitucionMesas usa sillasBase=6 como threshold para incompletas
    // #4: cap=2 < 6 → incompleta, déficit=4 → recibe las 4 (2→6)
    state = applyRestitucion(state, UUID(1), 6, 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(6);
    expect(getMesa(state, UUID(4)).capacity).toBe(6); // restituido a base
    expect(state.respaldo).toBe(0);
    expect(totalSillas(state)).toBe(totalPre);
  });
});

// =============================================================================
// FLUJO F: Borrar mesa con cascade (eliminar mesa + redistribuir sus sillas)
// =============================================================================
describe("Flujo F: Eliminar mesa con redistribución en cascade", () => {
  it("elimina mesa libre, redistribuye sus sillas a incompletas y respaldo", () => {
    // Config: 3 mesas
    // Mesa #1: capacity=6, base=4 → ocupada
    // Mesa #2: capacity=2, base=4 → incompleta (necesita 2)
    // Mesa #3: capacity=4, base=4 → completa, a eliminar
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 6, base_seats: 4 }),
        makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4 }),
        makeTable({ id: UUID(3), number: "3", capacity: 4, base_seats: 4 }),
      ],
      respaldo: 0,
    };
    const totalPre = totalSillas(state); // 6+2+4=12

    // Cascade delete de mesa #3 (base=4): el flujo real (handleDeleteTableCascade)
    // delega en redistribuirReduccion para repartir las sillas huerfanas
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(
      4,
      state.respaldo,
      UUID(3),
      state.tables,
    );
    // #2 necesita 2 (cap=2, base=4) → recibe 2
    // Sobran 2 → respaldo
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0]).toMatchObject({ id: UUID(2), capacity: 4, is_active: true });
    expect(nuevoRespaldoBodega).toBe(2);

    // Aplicar: mesa #3 soft-deleted (is_active=false, conserva su capacity como
    // fila muerta fuera del inventario util), #2 actualizada, respaldo actualizado
    const stateAfter: SystemState = {
      tables: state.tables.map((t) => {
        if (t.id === UUID(3)) return { ...t, is_active: false };
        const mod = mesasModificadasEnCascada.find((m) => m.id === t.id);
        if (mod) return { ...t, capacity: mod.capacity, is_active: mod.is_active };
        return { ...t };
      }),
      respaldo: nuevoRespaldoBodega,
    };

    expect(getMesa(stateAfter, UUID(3)).is_active).toBe(false);
    expect(getMesa(stateAfter, UUID(2)).capacity).toBe(4);
    expect(stateAfter.respaldo).toBe(2);
    // Inventario util (activas + respaldo) se conserva: 6+4+2=12
    const totalUtil =
      stateAfter.tables.filter((t) => t.is_active).reduce((s, t) => s + t.capacity, 0) + stateAfter.respaldo;
    expect(totalUtil).toBe(totalPre);
    expect(stateAfter.tables.filter((t) => t.is_active)).toHaveLength(2);
  });
});

// =============================================================================
// FLUJO G: Estrés — Múltiples mesas, muchas operaciones encadenadas
// =============================================================================
describe("Flujo G: Estrés con 10 mesas y operaciones encadenadas", () => {
  it("10 mesas, 50 sillas, 4 silla/mesa, respaldo 10", () => {
    let state: SystemState = {
      tables: Array.from({ length: 10 }, (_, i) =>
        makeTable({ id: UUID(i + 1), number: String(i + 1), capacity: 4, base_seats: 4 })
      ),
      respaldo: 10,
    };
    const totalPre = totalSillas(state);
    expect(totalPre).toBe(50);

    // Abrir mesa #1 con 10 guests (needs +6) → respaldo 10→4
    state = applyAumento(state, UUID(1), 6);
    expect(getMesa(state, UUID(1)).capacity).toBe(10);
    expect(state.respaldo).toBe(4);

    // Abrir mesa #2 con 8 guests (needs +4) → respaldo 4→0
    state = applyAumento(state, UUID(2), 4);
    expect(getMesa(state, UUID(2)).capacity).toBe(8);
    expect(state.respaldo).toBe(0);

    // Abrir mesa #3 con 8 guests (needs +4) → respaldo=0, roba de #10 (num="10", cap=4)
    // #10 da todas sus 4 → cap=0, is_active=false
    state = applyAumento(state, UUID(3), 4);
    expect(getMesa(state, UUID(3)).capacity).toBe(8);
    expect(getMesa(state, UUID(10)).capacity).toBe(0);
    expect(getMesa(state, UUID(10)).is_active).toBe(true);
    expect(getMesa(state, UUID(9)).capacity).toBe(4); // no se tocó
    expect(totalSillas(state)).toBe(totalPre);

    // Reducir mesa #1 de 10→6 (libera 4)
    // Incompleta: #10 (cap=0, base=4) → recibe 4 (cap=4, is_active=true)
    state = applyReduccion(state, UUID(1), 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(6);
    expect(getMesa(state, UUID(10)).capacity).toBe(4); // restituido
    expect(getMesa(state, UUID(10)).is_active).toBe(true);
    expect(totalSillas(state)).toBe(totalPre);

    // Reducir mesa #2 de 8→4 (libera 4), todas completas → a respaldo
    state = applyReduccion(state, UUID(2), 4);
    expect(getMesa(state, UUID(2)).capacity).toBe(4);
    expect(state.respaldo).toBe(4); // 0+4=4
    expect(totalSillas(state)).toBe(totalPre);

    // Cerrar mesa #3: libera 4 (8→4), todas completas → a respaldo
    state = applyRestitucion(state, UUID(3), 4, 4);
    expect(getMesa(state, UUID(3)).capacity).toBe(4);
    expect(state.respaldo).toBe(8); // 4+4=8
    expect(totalSillas(state)).toBe(totalPre);

    // Verificar estado final
    expect(getMesa(state, UUID(1)).capacity).toBe(6); // aún con guests extra
    expect(getMesa(state, UUID(2)).capacity).toBe(4);
    expect(getMesa(state, UUID(3)).capacity).toBe(4);
    for (let i = 4; i <= 10; i++) {
      expect(getMesa(state, UUID(i)).capacity).toBe(4);
    }
  });
});

// =============================================================================
// FLUJO H: Round-trip extremo — múltiples aumentos y reducciones en cadena
// =============================================================================
describe("Flujo H: Round-trip extremo con 5 mesas", () => {
  it("aumento→reduccion 3 veces consecutivas siempre preserva invariante", () => {
    let state: SystemState = {
      tables: Array.from({ length: 5 }, (_, i) =>
        makeTable({ id: UUID(i + 1), number: String(i + 1), capacity: 4, base_seats: 4 })
      ),
      respaldo: 0,
    };
    const totalPre = totalSillas(state);

    // Ciclo 1: Mesa #1 +6, luego -6
    state = applyAumento(state, UUID(1), 6); // 4→10, roba de 4 mesas
    expect(totalSillas(state)).toBe(totalPre);
    state = applyReduccion(state, UUID(1), 6); // 10→4, distribuye
    expect(totalSillas(state)).toBe(totalPre);
    expect(getMesa(state, UUID(1)).capacity).toBe(4);

    // Ciclo 2: Mesa #2 +8, luego -8
    state = applyAumento(state, UUID(2), 8);
    expect(totalSillas(state)).toBe(totalPre);
    state = applyReduccion(state, UUID(2), 8);
    expect(totalSillas(state)).toBe(totalPre);
    expect(getMesa(state, UUID(2)).capacity).toBe(4);

    // Ciclo 3: Mesa #3 +10, luego -10
    state = applyAumento(state, UUID(3), 10);
    expect(totalSillas(state)).toBe(totalPre);
    state = applyReduccion(state, UUID(3), 10);
    expect(totalSillas(state)).toBe(totalPre);
    expect(getMesa(state, UUID(3)).capacity).toBe(4);

    // Estado final: todas las mesas en capacity 4, respaldo 0
    state.tables.forEach((t) => expect(t.capacity).toBe(4));
    expect(state.respaldo).toBe(0);
  });
});

// =============================================================================
// FLUJO I: Reactivación de mesas inactivas
// =============================================================================
describe("Flujo I: Reactivación de mesas inactivas", () => {
  it("reducir guests reactiva mesa inactiva y preserva invariante", () => {
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4 }),
        makeTable({ id: UUID(2), number: "2", capacity: 0, base_seats: 4, is_active: false }),
      ],
      respaldo: 0,
    };
    const totalPre = totalSillas(state); // 8+0=8

    // Reducir mesa #1 de 8→4 (libera 4)
    // Mesa #2 necesita 4 (capacity 0→4, is_active true)
    state = applyReduccion(state, UUID(1), 4);
    expect(getMesa(state, UUID(1)).capacity).toBe(4);
    expect(getMesa(state, UUID(2)).capacity).toBe(4);
    expect(getMesa(state, UUID(2)).is_active).toBe(true);
    // 4 liberadas, 4 donadas, 0 a respaldo
    expect(state.respaldo).toBe(0);
    expect(totalSillas(state)).toBe(totalPre);
  });

  it("aumento no reactiva mesa inactiva (no roba de ella)", () => {
    let state: SystemState = {
      tables: [
        makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4 }),
        makeTable({ id: UUID(2), number: "2", capacity: 0, base_seats: 4, is_active: false }),
      ],
      respaldo: 0,
    };
    const totalPre = totalSillas(state); // 4+0=4

    // Mesa #1 necesita 4, respaldo=0, mesa #2 inactiva no robable
    expect(() => applyAumento(state, UUID(1), 4)).toThrow("No hay suficientes sillas");
  });
});

// =============================================================================
// FLUJO J: Verificación de no-fugas (invariante en cada operación)
// =============================================================================
describe("Flujo J: Verificación de invariante después de cada operación", () => {
  it("100 operaciones aleatorias no pierden sillas", () => {
    let state: SystemState = {
      tables: Array.from({ length: 5 }, (_, i) =>
        makeTable({ id: UUID(i + 1), number: String(i + 1), capacity: 4, base_seats: 4 })
      ),
      respaldo: 5,
    };
    const totalPre = totalSillas(state);

    // Secuencia determinista de 12 operaciones
    const operaciones: Array<{ tipo: "aumento" | "reduccion"; mesaIdx: number; sillas: number }> = [
      { tipo: "aumento", mesaIdx: 0, sillas: 3 },
      { tipo: "aumento", mesaIdx: 1, sillas: 5 },
      { tipo: "reduccion", mesaIdx: 0, sillas: 3 },
      { tipo: "aumento", mesaIdx: 2, sillas: 4 },
      { tipo: "aumento", mesaIdx: 3, sillas: 6 },
      { tipo: "reduccion", mesaIdx: 2, sillas: 4 },
      { tipo: "reduccion", mesaIdx: 1, sillas: 5 },
      { tipo: "aumento", mesaIdx: 4, sillas: 2 },
      { tipo: "aumento", mesaIdx: 0, sillas: 4 },
      { tipo: "reduccion", mesaIdx: 3, sillas: 6 },
      { tipo: "reduccion", mesaIdx: 4, sillas: 2 },
      { tipo: "reduccion", mesaIdx: 0, sillas: 4 },
    ];

    for (const op of operaciones) {
      const mesaId = UUID(op.mesaIdx + 1);
      if (op.tipo === "aumento") {
        try {
          state = applyAumento(state, mesaId, op.sillas);
        } catch {
          // Si no alcanzan sillas, la operación se rechaza (no modifica estado)
        }
      } else {
        state = applyReduccion(state, mesaId, op.sillas);
      }
      expect(totalSillas(state)).toBe(totalPre);
    }

    // Después de 12 operaciones, el invariante sigue intacto
    expect(totalSillas(state)).toBe(totalPre);
  });
});
