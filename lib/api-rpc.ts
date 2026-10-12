import { apiFetch } from "@/lib/api-fetch";

export async function rpcUpdateTableDistribution(params: {
  tableId: string;
  capacity: number;
  currentGuests: number;
  section: string;
  cascade: Array<{ id: string; capacity: number; is_active: boolean }>;
  configId: string | null;
  sillasRespaldo: number;
}) {
  await apiFetch("/api/tables/distribute", {
    method: "POST",
    body: JSON.stringify({
      tableId: params.tableId,
      capacity: params.capacity,
      currentGuests: params.currentGuests,
      section: params.section,
      cascadeIds: params.cascade.map((c) => c.id),
      cascadeCapacities: params.cascade.map((c) => c.capacity),
      cascadeIsActive: params.cascade.map((c) => c.is_active),
      configId: params.configId,
      sillasRespaldo: params.sillasRespaldo,
    }),
  });
}
