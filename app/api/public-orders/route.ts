import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { customerInfoSchema } from "@/lib/api-schemas";
import { handleApiError } from "@/lib/api-error";
import { priceOrderItems, type CatalogProduct } from "@/lib/pricing";
import { isOpenNow, type WeekSchedule } from "@/lib/schedule";
import type { ChannelsInput } from "@/lib/api-schemas";
import type { Database } from "@/lib/database.types";

type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];

const publicOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid("ID de producto invalido"),
        name: z.string().min(1),
        quantity: z.number().int().min(1, "Cantidad minima es 1"),
        modifiers: z.any(),
      }),
    )
    .min(1, "El pedido debe tener al menos un producto"),
  customer: customerInfoSchema,
  type: z.enum(["delivery", "pickup"], {
    errorMap: () => ({ message: "El tipo debe ser delivery o pickup" }),
  }),
  payment_method: z.enum(["cash", "card", "transfer"], {
    errorMap: () => ({ message: "El metodo de pago debe ser cash, card o transfer" }),
  }),
  notes: z.string().max(500).optional(),
});

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = publicOrderSchema.parse(body);

    const orderNotes = parsed.notes
      ? `Metodo de pago: ${PAYMENT_LABELS[parsed.payment_method]}. ${parsed.notes}`
      : `Metodo de pago: ${PAYMENT_LABELS[parsed.payment_method]}`;

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, basePrice, sizes, sauces, extras, available")
      .in("id", parsed.items.map((item) => item.product_id));

    if (productsError) throw productsError;

    const unavailable = parsed.items.find(
      (item) => products?.find((p) => p.id === item.product_id)?.available === false,
    );
    if (unavailable) {
      return NextResponse.json({ error: "Uno o más productos no están disponibles" }, { status: 400 });
    }

    const priced = priceOrderItems(products as unknown as CatalogProduct[], parsed.items);
    const computedTotal = priced.reduce((sum, item) => sum + item.total_price, 0);

    // Kill switch + reglas de canal (fuente de verdad en restaurant_config)
    const { data: cfg } = await supabaseAdmin
      .from("restaurant_config")
      .select("web_orders_enabled, schedule, timezone, closed_until, channels")
      .limit(1)
      .maybeSingle();

    const cfgSchedule = (cfg?.schedule ?? null) as WeekSchedule | null;
    const cfgChannels = (cfg?.channels ?? {}) as ChannelsInput;
    const cfgTimezone = (cfg?.timezone as string | undefined) ?? "America/Mexico_City";

    if (cfg?.web_orders_enabled === false) {
      return NextResponse.json({ error: "Los pedidos en línea están desactivados temporalmente" }, { status: 400 });
    }
    if (!isOpenNow(cfgSchedule, cfgTimezone, cfg?.closed_until)) {
      return NextResponse.json({ error: "Estamos fuera de horario, intenta más tarde" }, { status: 400 });
    }
    const channel = parsed.type === "delivery" ? cfgChannels.delivery : cfgChannels.pickup;
    if (channel?.enabled === false) {
      return NextResponse.json(
        { error: parsed.type === "delivery" ? "El delivery está desactivado por ahora" : "Los pedidos para recoger están desactivados por ahora" },
        { status: 400 },
      );
    }
    const deliveryFee = parsed.type === "delivery" ? Number(channel?.fee ?? 0) : 0;
    const minOrder = parsed.type === "delivery" ? Number(channel?.min_order ?? 0) : 0;
    if (minOrder > 0 && computedTotal < minOrder) {
      return NextResponse.json({ error: `El pedido mínimo para delivery es $${minOrder.toFixed(2)}` }, { status: 400 });
    }

    const orderData: OrderInsert = {
      // V9-DB-05: sin order_number — lo asigna la secuencia (UNIQUE en BD).
      type: parsed.type,
      status: "pending",
      payment_status: "pending",
      customer_info: parsed.customer,
      subtotal: computedTotal,
      total: 0,
      source: "web",
      delivery_fee: deliveryFee,
      notes: orderNotes,
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("[public-orders] Error creando orden:", orderError);
      return NextResponse.json({ error: "Error al crear el pedido" }, { status: 500 });
    }

    const { error: itemsError } = await supabaseAdmin.rpc("add_order_items", {
      p_order_id: order.id,
      p_items: priced.map((item, idx) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        modifiers: parsed.items[idx]?.modifiers ?? {},
      })),
    });

    if (itemsError) {
      console.error("[public-orders] Error creando items:", itemsError);
      return NextResponse.json({ error: "Error al crear los items del pedido" }, { status: 500 });
    }

    return NextResponse.json(
      { id: order.id, order_number: order.order_number },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
