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

/** Calcula la suma total de sillas en el sistema: sum(capacities) + respaldo */
function totalSillas(mesas: Table[], respaldo: number): number {
  return mesas.reduce((sum, m) => sum + m.capacity, 0) + respaldo;
}

function totalSillasCascade(payloads: MesaCascadePayload[]): number {
  return payloads.reduce((sum, p) => sum + p.capacity, 0);
}

// =============================================================================
// redistribuirAumento
// =============================================================================
describe("redistribuirAumento", () => {
  it("toma sillas completamente de bodega cuando hay suficiente respaldo", () => {
    const mesas = [makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" })];
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirAumento(3, 5, UUID(1), mesas);
    expect(nuevoRespaldoBodega).toBe(2);
    expect(mesasModificadasEnCascada).toHaveLength(0);
  });

  it("toma de bodega y de mesas libres cuando respaldo es insuficiente", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 5, status: "free" }),
    ];
    // Necesita 8, respaldo=3 → toma 3 de bodega + 5 de mesa #2
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirAumento(8, 3, UUID(1), mesas);
    expect(nuevoRespaldoBodega).toBe(0);
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0]).toMatchObject({ id: UUID(2), capacity: 0, is_active: true });
  });

  it("toma de múltiples mesas libres cuando no hay respaldo", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, status: "free" }),
      makeTable({ id: UUID(3), number: "3", capacity: 4, status: "free" }),
      makeTable({ id: UUID(4), number: "20", capacity: 4, status: "free" }),
    ];
    // mesaId=UUID(1), excluye origen → 3 mesas robables con 4+4+4=12.
    // Necesita 10, respaldo=0 → roba 4+4+2
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirAumento(10, 0, UUID(1), mesas);
    expect(nuevoRespaldoBodega).toBe(0);
    expect(mesasModificadasEnCascada).toHaveLength(3);
    // Orden descendente: #20 (UUID4), #3, #2
    expect(mesasModificadasEnCascada[0].id).toBe(UUID(4));
    expect(mesasModificadasEnCascada[0].capacity).toBe(0);
    expect(mesasModificadasEnCascada[0].is_active).toBe(true);
    expect(mesasModificadasEnCascada[1].id).toBe(UUID(3));
    expect(mesasModificadasEnCascada[1].capacity).toBe(0);
    expect(mesasModificadasEnCascada[1].is_active).toBe(true);
    expect(mesasModificadasEnCascada[2].id).toBe(UUID(2));
    expect(mesasModificadasEnCascada[2].capacity).toBe(2);
    expect(mesasModificadasEnCascada[2].is_active).toBe(true);
  });

  it("lanza error cuando no hay suficientes sillas en todo el local", () => {
    const mesas = [makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" })];
    expect(() => redistribuirAumento(20, 0, UUID(1), mesas)).toThrow("No hay suficientes sillas");
  });

  it("toma exactas de bodega sin modificar mesas", () => {
    const mesas = [makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" })];
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirAumento(5, 5, UUID(1), mesas);
    expect(nuevoRespaldoBodega).toBe(0);
    expect(mesasModificadasEnCascada).toHaveLength(0);
  });

  it("excluye la mesa origen del robo", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, status: "free" }),
    ];
    const { mesasModificadasEnCascada } = redistribuirAumento(4, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0].id).not.toBe(UUID(1));
  });

  it("excluye mesas inactivas del robo", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, status: "free", is_active: false }),
      makeTable({ id: UUID(3), number: "3", capacity: 4, status: "free" }),
    ];
    // mesaId=UUID(1), mesa #2 inactiva, mesa #3 activa → roba de #3
    const { mesasModificadasEnCascada } = redistribuirAumento(4, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0].id).toBe(UUID(3));
  });

  it("roba en orden descendente por número de mesa", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 10, status: "free" }),
      makeTable({ id: UUID(2), number: "10", capacity: 5, status: "free" }),
    ];
    // Necesita 4, respaldo=0 → debe robar de #10 primero (mayor número)
    const { mesasModificadasEnCascada } = redistribuirAumento(4, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0].id).toBe(UUID(2)); // #10
    expect(mesasModificadasEnCascada[0].capacity).toBe(1); // 5-4=1
  });

  it("retorna sin cambios cuando sillasNecesarias es 0", () => {
    const mesas = [makeTable({ id: UUID(1), number: "1", capacity: 4 })];
    const result = redistribuirAumento(0, 5, UUID(1), mesas);
    expect(result.nuevoRespaldoBodega).toBe(5);
    expect(result.mesasModificadasEnCascada).toHaveLength(0);
  });

  it("mesa origen con capacity > 0 recibe aumento incremental", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, status: "free" }),
    ];
    // Mesa #1 ya tiene 4, necesita 2 más (total 6)
    const { mesasModificadasEnCascada } = redistribuirAumento(2, 3, UUID(1), mesas);
    // Toma 2 de bodega (respaldo 3→1), sin tocar mesas
    expect(mesasModificadasEnCascada).toHaveLength(0);
  });

  it("no roba de mesa free con capacity=0", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 0, status: "free", is_active: false }),
    ];
    // Necesita 4, respaldo=0 → mesa #2 no puede prestar (capacity=0)
    expect(() => redistribuirAumento(4, 0, UUID(1), mesas)).toThrow("No hay suficientes sillas");
  });

  it("mesa presta parcialmente y queda con capacidad residual", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 2, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 3, status: "free" }),
      makeTable({ id: UUID(3), number: "3", capacity: 5, status: "free" }),
    ];
    // mesaId=UUID(1), excluye origen.
    // Robables: #3 cap=5, #2 cap=3 (orden descendente).
    // Necesita 6, respaldo=0:
    //   - #3: roba 5 (5→0), quedan 1 por conseguir
    //   - #2: roba 1 (3→2), queda residual cap=2, is_active=true
    const { mesasModificadasEnCascada } = redistribuirAumento(6, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(2);
    const m2 = mesasModificadasEnCascada.find((m) => m.id === UUID(2))!;
    expect(m2.capacity).toBe(2);
    expect(m2.is_active).toBe(true);
    const m3 = mesasModificadasEnCascada.find((m) => m.id === UUID(3))!;
    expect(m3.capacity).toBe(0);
    expect(m3.is_active).toBe(true);
  });

  it("invariante: total de sillas se conserva post-aumento", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, status: "free" }),
      makeTable({ id: UUID(3), number: "3", capacity: 4, status: "free" }),
    ];
    const respaldoInicial = 2;
    const totalInicial = totalSillas(mesas, respaldoInicial);

    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirAumento(6, respaldoInicial, UUID(1), mesas);

    const capacidadesFinales = mesas.map((m) => {
      const mod = mesasModificadasEnCascada.find((p) => p.id === m.id);
      return mod ? mod.capacity : m.capacity;
    });

    // Mesa origen 1: capacity aumenta de 4 a 4+6=10
    capacidadesFinales[0] = 10; // La mesa origen modifica su capacidad internamente pero no aparece en cascade
    const totalFinal = capacidadesFinales.reduce((s, c) => s + c, 0) + nuevoRespaldoBodega;
    expect(totalFinal).toBe(totalInicial);
  });
});

// =============================================================================
// redistribuirReduccion
// =============================================================================
describe("redistribuirReduccion", () => {
  it("distribuye sillas a mesas incompletas que necesitan capacidad", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(3), number: "3", capacity: 2, base_seats: 4, status: "free" }),
    ];
    // Mesa #1 libera 4 sillas → 2 a #2, 2 a #3
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(4, 0, UUID(1), mesas);
    expect(nuevoRespaldoBodega).toBe(0);
    expect(mesasModificadasEnCascada).toHaveLength(2);
    expect(mesasModificadasEnCascada[0]).toMatchObject({ id: UUID(2), capacity: 4, is_active: true });
    expect(mesasModificadasEnCascada[1]).toMatchObject({ id: UUID(3), capacity: 4, is_active: true });
  });

  it("envía excedente a respaldo cuando ya todas están completas", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4, status: "free" }),
    ];
    // Mesa #1 libera 4 sillas, #2 ya está completa → todo a respaldo
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(4, 2, UUID(1), mesas);
    expect(nuevoRespaldoBodega).toBe(6); // 2 + 4
    expect(mesasModificadasEnCascada).toHaveLength(0);
  });

  it("sin mesas incompletas: todo va a respaldo", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4, status: "free" }),
    ];
    const { nuevoRespaldoBodega } = redistribuirReduccion(5, 0, UUID(1), mesas);
    expect(nuevoRespaldoBodega).toBe(5);
  });

  it("distribuye en orden ascendente por número de mesa", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "10", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(3), number: "5", capacity: 2, base_seats: 4, status: "free" }),
    ];
    // Mesa #10 libera 4 → debe ir a #2 primero (menor número), luego #5
    const { mesasModificadasEnCascada } = redistribuirReduccion(4, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(2);
    expect(mesasModificadasEnCascada[0].id).toBe(UUID(2)); // #2
    expect(mesasModificadasEnCascada[1].id).toBe(UUID(3)); // #5
  });

  it("retorna sin cambios cuando sillasALiberar es 0", () => {
    const mesas = [makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4 })];
    const result = redistribuirReduccion(0, 3, UUID(1), mesas);
    expect(result.nuevoRespaldoBodega).toBe(3);
    expect(result.mesasModificadasEnCascada).toHaveLength(0);
  });

  it("reactiva mesa incompleta con capacity=0 (is_active=false)", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 0, base_seats: 4, status: "free", is_active: false }),
    ];
    const { mesasModificadasEnCascada, nuevoRespaldoBodega } = redistribuirReduccion(4, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0].id).toBe(UUID(2));
    expect(mesasModificadasEnCascada[0].capacity).toBe(4);
    expect(mesasModificadasEnCascada[0].is_active).toBe(true);
    expect(nuevoRespaldoBodega).toBe(0);
  });

  it("gran déficit: distribuye lo disponible y envía el resto a respaldo", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 1, base_seats: 4, status: "free" }),
    ];
    // Mesa #1 libera 4, #2 necesita 3 → solo se donan 3, sobra 1 a respaldo
    const { mesasModificadasEnCascada, nuevoRespaldoBodega } = redistribuirReduccion(4, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0].capacity).toBe(4);
    expect(nuevoRespaldoBodega).toBe(1);
  });

  it("liberación exacta sin excedente", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
    ];
    // Mesa #2 necesita 2, mesa #1 libera 2 exactos
    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(2, 0, UUID(1), mesas);
    expect(mesasModificadasEnCascada).toHaveLength(1);
    expect(mesasModificadasEnCascada[0].capacity).toBe(4);
    expect(nuevoRespaldoBodega).toBe(0);
  });

  it("invariante: total de sillas se conserva post-reducción", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(3), number: "3", capacity: 3, base_seats: 4, status: "free" }),
    ];
    const respaldoInicial = 1;
    const totalInicial = totalSillas(mesas, respaldoInicial);

    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(4, respaldoInicial, UUID(1), mesas);

    const capacidadesFinales = mesas.map((m) => {
      const mod = mesasModificadasEnCascada.find((p) => p.id === m.id);
      return mod ? mod.capacity : m.id === UUID(1) ? m.capacity - 4 : m.capacity;
    });

    const totalFinal = capacidadesFinales.reduce((s, c) => s + c, 0) + nuevoRespaldoBodega;
    expect(totalFinal).toBe(totalInicial);
  });
});

// =============================================================================
// calcularRestitucionMesas
// =============================================================================
describe("calcularRestitucionMesas", () => {
  it("distribuye sillas excedentes a mesas incompletas", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(3), number: "3", capacity: 2, base_seats: 4, status: "free" }),
    ];
    // Mesa #1 libera 4 excedentes → 2 a #2, 2 a #3
    const { mesasARestituir, nuevoRespaldo } = calcularRestitucionMesas(mesas, UUID(1), 4, 8, 0);
    expect(mesasARestituir).toHaveLength(2);
    expect(mesasARestituir[0]).toMatchObject({ id: UUID(2), capacity: 4, is_active: true });
    expect(mesasARestituir[1]).toMatchObject({ id: UUID(3), capacity: 4, is_active: true });
    expect(nuevoRespaldo).toBe(0);
  });

  it("envía excedente a respaldo cuando no hay mesas incompletas", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4, status: "free" }),
    ];
    const { mesasARestituir, nuevoRespaldo } = calcularRestitucionMesas(mesas, UUID(1), 4, 8, 2);
    expect(mesasARestituir).toHaveLength(0);
    expect(nuevoRespaldo).toBe(6); // 2 + 4
  });

  it("excluye la mesa origen de la restitución", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 3, base_seats: 4, status: "free" }),
    ];
    const { mesasARestituir } = calcularRestitucionMesas(mesas, UUID(1), 4, 8, 0);
    const ids = mesasARestituir.map((m) => m.id);
    expect(ids).not.toContain(UUID(1));
    expect(ids).toContain(UUID(2));
  });

  it("retorna sin cambios cuando sillasExcedentes es 0", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4 }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4 }),
    ];
    const result = calcularRestitucionMesas(mesas, UUID(1), 4, 4, 3);
    expect(result.mesasARestituir).toHaveLength(0);
    expect(result.nuevoRespaldo).toBe(3);
  });

  it("distribuye a múltiples mesas con diferentes déficits", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 10, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }), // déficit 2
      makeTable({ id: UUID(3), number: "3", capacity: 1, base_seats: 4, status: "free" }), // déficit 3
      makeTable({ id: UUID(4), number: "4", capacity: 3, base_seats: 4, status: "free" }), // déficit 1
    ];
    // Mesa #1 libera 6 excedentes: 2+3+1 = 6 exactos
    const { mesasARestituir, nuevoRespaldo } = calcularRestitucionMesas(mesas, UUID(1), 4, 10, 0);
    expect(mesasARestituir).toHaveLength(3);
    expect(nuevoRespaldo).toBe(0);
    expect(mesasARestituir.find((m) => m.id === UUID(2))!.capacity).toBe(4);
    expect(mesasARestituir.find((m) => m.id === UUID(3))!.capacity).toBe(4);
    expect(mesasARestituir.find((m) => m.id === UUID(4))!.capacity).toBe(4);
  });

  it("reactiva mesa incompleta con capacity=0", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 0, base_seats: 4, status: "free", is_active: false }),
    ];
    const { mesasARestituir } = calcularRestitucionMesas(mesas, UUID(1), 4, 8, 0);
    const mesa2 = mesasARestituir.find((m) => m.id === UUID(2))!;
    expect(mesa2.capacity).toBe(4);
    expect(mesa2.is_active).toBe(true);
  });

  it("no toca mesa inactiva completa (hija de join / soft-deleted)", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4, status: "free", is_active: false }),
      makeTable({ id: UUID(3), number: "3", capacity: 0, base_seats: 4, status: "free", is_active: false }),
    ];
    // Excedente 4 de #1: la inactiva #2 (completa) no debe tocarse ni reactivarse;
    // la inactiva #3 (capacity 0, deficit real) recibe y se reactiva.
    const { mesasARestituir } = calcularRestitucionMesas(mesas, UUID(1), 4, 8, 0);
    expect(mesasARestituir).toHaveLength(1);
    expect(mesasARestituir[0]).toMatchObject({ id: UUID(3), capacity: 4, is_active: true });
  });

  it("no materializa sillas con mesa inactiva sobre-completa (deficit negativo)", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 6, base_seats: 4, status: "free", is_active: false }),
    ];
    // Antes del fix: #2 matcheaba por !is_active, faltaParaLlenar salia negativo,
    // aDevolver negativo incrementaba el pool (sillas de la nada). Ahora: no se
    // toca y el excedente completo va a respaldo (conservacion).
    const respaldoInicial = 2;
    const totalInicial = totalSillas(mesas, respaldoInicial); // 8+6+2=16
    const { mesasARestituir, nuevoRespaldo, capacityFinalMesa } = calcularRestitucionMesas(
      mesas,
      UUID(1),
      4,
      8,
      respaldoInicial,
    );
    expect(mesasARestituir).toHaveLength(0);
    expect(nuevoRespaldo).toBe(6); // 2 + 4 excedentes
    expect(capacityFinalMesa).toBe(4);
    expect(capacityFinalMesa + 6 + nuevoRespaldo).toBe(totalInicial); // (4+6)+6=16
  });

  it("completa el deficit de la mesa origen desde bodega", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 2, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4, status: "free" }),
    ];
    const { mesasARestituir, nuevoRespaldo, capacityFinalMesa } = calcularRestitucionMesas(mesas, UUID(1), 4, 2, 6);
    expect(mesasARestituir).toHaveLength(0);
    expect(nuevoRespaldo).toBe(4); // 6 - 2
    expect(capacityFinalMesa).toBe(4);
  });

  it("bodega insuficiente: la mesa origen queda con capacity parcial", () => {
    const mesas = [makeTable({ id: UUID(1), number: "1", capacity: 2, base_seats: 4, status: "free" })];
    const { nuevoRespaldo, capacityFinalMesa } = calcularRestitucionMesas(mesas, UUID(1), 4, 2, 1);
    expect(nuevoRespaldo).toBe(0);
    expect(capacityFinalMesa).toBe(3);
  });

  it("invariante: el deficit de la mesa origen se conserva (bodega decrementa)", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 2, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 3, base_seats: 4, status: "free" }),
    ];
    const respaldoInicial = 5;
    const totalInicial = totalSillas(mesas, respaldoInicial); // 2+3+5=10
    const { mesasARestituir, nuevoRespaldo, capacityFinalMesa } = calcularRestitucionMesas(
      mesas,
      UUID(1),
      4,
      2,
      respaldoInicial,
    );
    expect(mesasARestituir).toHaveLength(0);
    expect(capacityFinalMesa).toBe(4); // 2 + 2 de bodega
    expect(nuevoRespaldo).toBe(3); // 5 - 2
    expect(capacityFinalMesa + 3 + nuevoRespaldo).toBe(totalInicial); // (4+3)+3=10
  });

  it("invariante: total de sillas se conserva post-restitucion", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(3), number: "3", capacity: 3, base_seats: 4, status: "free" }),
    ];
    const respaldoInicial = 1;
    const totalInicial = totalSillas(mesas, respaldoInicial);

    const { mesasARestituir, nuevoRespaldo } = calcularRestitucionMesas(mesas, UUID(1), 4, 8, respaldoInicial);

    const capacidadesFinales = mesas.map((m) => {
      if (m.id === UUID(1)) return 4; // mesa origen se restituye a base
      const mod = mesasARestituir.find((p) => p.id === m.id);
      return mod ? mod.capacity : m.capacity;
    });

    const totalFinal = capacidadesFinales.reduce((s, c) => s + c, 0) + nuevoRespaldo;
    expect(totalFinal).toBe(totalInicial);
  });
});

// =============================================================================
// Invariantes transaccionales
// =============================================================================
describe("invariantes transaccionales", () => {
  it("redistribuirAumento preserva el total de sillas del sistema", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, status: "free" }),
    ];
    const respaldo = 3;
    const totalPre = totalSillas(mesas, respaldo); // 4+4+3=11

    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirAumento(5, respaldo, UUID(1), mesas);

    // Mesa origen: capacity 4→9 (+5)
    // Mesas modificadas: roba de #2 (4→3) → -1
    // Respaldo: 3→0 → -3
    // Total final: (9+3) + 0 = 12 ≠ 11?! Something's wrong...
    // Wait, let me recalculate: 4+3=7 from respaldo alone.
    // Needs 5, respaldo 3 → takes 3 from respaldo (3→0), needs 2 more.
    // Roba 2 de #2 (4→2). So: mesa1=9, mesa2=2, respaldo=0 → total=11 ✓

    const capsAfter = mesas.map((m) => {
      const mod = mesasModificadasEnCascada.find((p) => p.id === m.id);
      if (mod) return mod.capacity;
      // Mesa origen: sumó sillasNecesarias
      if (m.id === UUID(1)) return m.capacity + 5;
      return m.capacity;
    });
    const totalPost = capsAfter.reduce((s, c) => s + c, 0) + nuevoRespaldoBodega;
    expect(totalPost).toBe(totalPre);
  });

  it("redistribuirReduccion preserva el total de sillas del sistema", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
    ];
    const respaldo = 1;
    const totalPre = totalSillas(mesas, respaldo); // 8+2+1=11

    const { nuevoRespaldoBodega, mesasModificadasEnCascada } = redistribuirReduccion(4, respaldo, UUID(1), mesas);

    // Mesa origen: capacity 8→4 (-4)
    // Mesa #2: 2→4 (+2)
    // Respaldo: 1→3 (+2) [porque 4-2=2 van a respaldo]
    // Total: (4+4)+3=11 ✓

    const capsAfter = mesas.map((m) => {
      const mod = mesasModificadasEnCascada.find((p) => p.id === m.id);
      if (mod) return mod.capacity;
      if (m.id === UUID(1)) return m.capacity - 4; // liberó 4
      return m.capacity;
    });
    const totalPost = capsAfter.reduce((s, c) => s + c, 0) + nuevoRespaldoBodega;
    expect(totalPost).toBe(totalPre);
  });

  it("calcularRestitucionMesas preserva el total de sillas del sistema", () => {
    const mesas = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
    ];
    const respaldo = 0;
    const totalPre = totalSillas(mesas, respaldo); // 8+2=10

    const { mesasARestituir, nuevoRespaldo } = calcularRestitucionMesas(mesas, UUID(1), 4, 8, respaldo);

    // Mesa origen: 8→4 (-4)
    // Mesa #2: 2→4 (+2)
    // Respaldo: 0→2 (+2)
    // Total: (4+4)+2=10 ✓

    const capsAfter = mesas.map((m) => {
      if (m.id === UUID(1)) return 4; // restituida a base
      const mod = mesasARestituir.find((p) => p.id === m.id);
      return mod ? mod.capacity : m.capacity;
    });
    const totalPost = capsAfter.reduce((s, c) => s + c, 0) + nuevoRespaldo;
    expect(totalPost).toBe(totalPre);
  });

  it("secuencia aumento→reduccion preserva estado (round-trip)", () => {
    const mesasIniciales = [
      makeTable({ id: UUID(1), number: "1", capacity: 4, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 4, base_seats: 4, status: "free" }),
    ];
    const respaldoInicial = 2;
    const totalPre = totalSillas(mesasIniciales, respaldoInicial); // 4+4+2=10

    // Fase 1: aumento de 4 sillas en mesa #1
    const aumento = redistribuirAumento(4, respaldoInicial, UUID(1), mesasIniciales);

    // Aplicar aumento en copia
    let mesas = mesasIniciales.map((m) => {
      if (m.id === UUID(1)) return { ...m, capacity: m.capacity + 4 };
      const mod = aumento.mesasModificadasEnCascada.find((p) => p.id === m.id);
      if (mod) return { ...m, capacity: mod.capacity, is_active: mod.is_active };
      return { ...m };
    });
    let respaldo = aumento.nuevoRespaldoBodega;

    // Verificar invariante post-aumento
    expect(totalSillas(mesas, respaldo)).toBe(totalPre);

    // Fase 2: reducción de 4 sillas en mesa #1
    const reduccion = redistribuirReduccion(4, respaldo, UUID(1), mesas);

    // Aplicar reducción
    mesas = mesas.map((m) => {
      if (m.id === UUID(1)) return { ...m, capacity: m.capacity - 4 };
      const mod = reduccion.mesasModificadasEnCascada.find((p) => p.id === m.id);
      if (mod) return { ...m, capacity: mod.capacity, is_active: mod.is_active };
      return { ...m };
    });
    respaldo = reduccion.nuevoRespaldoBodega;

    // El estado final debe ser igual al inicial
    expect(totalSillas(mesas, respaldo)).toBe(totalPre);
    expect(mesas.find((m) => m.id === UUID(1))!.capacity).toBe(4);
    expect(mesas.find((m) => m.id === UUID(2))!.capacity).toBe(4);
    expect(respaldo).toBe(2);
  });

  it("secuencia reduccion→aumento preserva estado (round-trip)", () => {
    const mesasIniciales = [
      makeTable({ id: UUID(1), number: "1", capacity: 8, base_seats: 4, status: "free" }),
      makeTable({ id: UUID(2), number: "2", capacity: 2, base_seats: 4, status: "free" }),
    ];
    const respaldoInicial = 0;
    const totalPre = totalSillas(mesasIniciales, respaldoInicial); // 8+2=10

    // Fase 1: reducción de 4 sillas en mesa #1 (vuelve a 4)
    const reduccion = redistribuirReduccion(4, respaldoInicial, UUID(1), mesasIniciales);

    let mesas = mesasIniciales.map((m) => {
      if (m.id === UUID(1)) return { ...m, capacity: m.capacity - 4 };
      const mod = reduccion.mesasModificadasEnCascada.find((p) => p.id === m.id);
      if (mod) return { ...m, capacity: mod.capacity, is_active: mod.is_active };
      return { ...m };
    });
    let respaldo = reduccion.nuevoRespaldoBodega;

    // Se espera: mesa1=4, mesa2=4 (recibió 2), respaldo=2 (sobraron 2)
    expect(totalSillas(mesas, respaldo)).toBe(totalPre);
    expect(mesas.find((m) => m.id === UUID(2))!.capacity).toBe(4);

    // Fase 2: aumento de 4 sillas en mesa #1 (vuelve a 8)
    const aumento = redistribuirAumento(4, respaldo, UUID(1), mesas);

    mesas = mesas.map((m) => {
      if (m.id === UUID(1)) return { ...m, capacity: m.capacity + 4 };
      const mod = aumento.mesasModificadasEnCascada.find((p) => p.id === m.id);
      if (mod) return { ...m, capacity: mod.capacity, is_active: mod.is_active };
      return { ...m };
    });
    respaldo = aumento.nuevoRespaldoBodega;

    // Estado debe ser: mesa1=8, mesa2=2, respaldo=0
    expect(totalSillas(mesas, respaldo)).toBe(totalPre);
    expect(mesas.find((m) => m.id === UUID(1))!.capacity).toBe(8);
    expect(mesas.find((m) => m.id === UUID(2))!.capacity).toBe(2);
    expect(respaldo).toBe(0);
  });
});
