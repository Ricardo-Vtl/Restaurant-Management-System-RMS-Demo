export interface DistribucionResult {
  reparto: { mesa: number; sillas: number }[];
  respaldoCalculado: number;
}

// Función pura matemática aislada (testeable, sin dependencias de React)
export function ejecutarAlgoritmoDistribucion(
  mesas: number,
  sillas: number,
  sillasSugeridas: number,
  forzarReparto: boolean,
): DistribucionResult {
  const totalMesas = Math.max(1, Math.floor(Number(mesas) || 1));
  const totalSillas = Math.max(0, Math.floor(Number(sillas) || 0));
  const objectivePorMesa = Math.max(0, Math.floor(Number(sillasSugeridas) || 0));

  let reparto = Array.from({ length: totalMesas }, (_, i) => ({
    mesa: i + 1,
    sillas: 0,
  }));

  if (forzarReparto) {
    const base = Math.floor(totalSillas / totalMesas);
    let remainder = totalSillas % totalMesas;
    reparto = reparto.map((m) => ({ ...m, sillas: base }));
    let index = totalMesas - 1;
    while (remainder > 0) {
      reparto[index].sillas += 1;
      remainder -= 1;
      index = index === 0 ? totalMesas - 1 : index - 1;
    }
    return { reparto, respaldoCalculado: 0 };
  }

  if (totalMesas * objectivePorMesa > totalSillas) {
    let sillasRestantes = totalSillas;
    for (let i = 0; i < totalMesas; i++) {
      if (sillasRestantes >= objectivePorMesa) {
        reparto[i].sillas = objectivePorMesa;
        sillasRestantes -= objectivePorMesa;
      } else {
        reparto[i].sillas = sillasRestantes;
        sillasRestantes = 0;
        break;
      }
    }
    return { reparto, respaldoCalculado: 0 };
  }

  reparto = reparto.map((m) => ({ ...m, sillas: objectivePorMesa }));
  const respaldoCalculado = totalSillas - totalMesas * objectivePorMesa;

  return { reparto, respaldoCalculado };
}
