import { z } from "zod";

// ── Products ──

const productOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre de la opción es obligatorio"),
  price: z.number().min(0, "El precio de la opción debe ser mayor o igual a 0"),
}).strict();

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100, "El nombre debe tener máximo 100 caracteres"),
  description: z.string().max(500, "La descripción debe tener máximo 500 caracteres").nullable().optional(),
  basePrice: z.number().min(0, "El precio base debe ser mayor o igual a 0"),
  category: z.string().min(1, "La categoría es obligatoria").max(50, "La categoría debe tener máximo 50 caracteres"),
  image: z.string().nullable().optional(),
  available: z.boolean().default(true),
  is_active: z.boolean().default(true),
  preparationTime: z.number().int("El tiempo de preparación debe ser un número entero").min(0, "El tiempo de preparación debe ser mayor o igual a 0").nullable().optional(),
  hasSizes: z.boolean().nullable().optional(),
  sizes: z.array(productOptionSchema).nullable().optional(),
  hasSauces: z.boolean().nullable().optional(),
  sauces: z.array(productOptionSchema).nullable().optional(),
  hasExtras: z.boolean().nullable().optional(),
  extras: z.array(productOptionSchema).nullable().optional(),
  hasSpiceLevel: z.boolean().nullable().optional(),
  spiceLevels: z.array(productOptionSchema).nullable().optional(),
}).strict();

// V9-SEC-05: id obligatorio — sin bulk por filtro abierto.
export const productUpdateSchema = z.object({
  filters: z.object({
    id: z.string().uuid("El ID debe ser un UUID válido"),
  }),
  updates: productSchema.partial().strict(),
}).strict();

// ── Customer Info (form validation) ──

export const customerInfoSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  phone: z.string().min(10, "El telefono debe tener al menos 10 digitos"),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// ── Orders ──

const orderStatusEnum = z.enum(["pending", "confirmed", "preparing", "ready", "on-the-way", "delivered", "completed", "cancelled"], {
  errorMap: () => ({ message: "El estado debe ser: pending, confirmed, preparing, ready, on-the-way, delivered, completed o cancelled" }),
});

export const orderSchema = z.object({
  // V9-DB-05: el folio lo asigna la secuencia (orders_order_number_seq) en BD,
  // no el cliente. UNIQUE en BD garantiza folios sin duplicados.
  table_id: z.string().uuid("El ID de mesa debe ser un UUID valido").nullable().optional(),
  type: z.enum(["dine-in", "delivery", "take-away", "pickup"], {
    errorMap: () => ({ message: "El tipo de orden debe ser: dine-in, delivery, take-away o pickup" }),
  }),
  status: z.enum(["pending", "confirmed", "preparing"], {
    errorMap: () => ({ message: "Las ordenes solo pueden crearse como pending, confirmed o preparing" }),
  }).optional(),
  waiter_id: z.string().uuid().nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  customer_info: customerInfoSchema.nullable().optional(),
  subtotal: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0, "El total debe ser mayor o igual a 0").default(0),
  notes: z.string().max(500).nullable().optional(),
}).strict()
  .refine(
    (data) => data.type !== "dine-in" || !!data.table_id,
    { message: "Las ordenes de comedor requieren una mesa asignada", path: ["table_id"] },
  )
  .refine(
    (data) => data.type !== "delivery" || (!!data.customer_info?.name && !!data.customer_info?.phone),
    { message: "Las ordenes de delivery requieren nombre y telefono del cliente", path: ["customer_info"] },
  );

export const reopenOrderSchema = z.object({
  id: z.string().uuid("El ID de la orden es obligatorio"),
}).strict();

export const orderStatusTransitionSchema = z.object({
  id: z.string().uuid("El ID de la orden es obligatorio"),
  status: z.enum(["confirmed", "preparing", "ready", "on-the-way", "delivered", "completed", "cancelled"]),
  cancel_reason: z.string().max(200).optional(),
}).strict().refine(
  (data) => data.status !== "cancelled" || !!data.cancel_reason,
  { message: "Se requiere un motivo de cancelacion", path: ["cancel_reason"] },
);

// ── Order Items ──

// V9-SEC-04: el cliente envía intención (producto, qty, modificadores), nunca montos.
// unit_price/total_price se calculan en servidor contra el catálogo (lib/pricing.ts).
export const orderItemSchema = z.object({
  order_id: z.string().uuid("El ID de orden es obligatorio y debe ser un UUID válido"),
  product_id: z.string().uuid("El ID del producto debe ser un UUID válido"),
  quantity: z.number().int("La cantidad debe ser un número entero").min(1, "La cantidad debe ser mayor a 0"),
  modifiers: z
    .object({
      size: z.object({ id: z.string(), name: z.string(), price: z.number() }).strict().optional(),
      sauce: z.object({ id: z.string(), name: z.string(), price: z.number() }).strict().optional(),
      spiceLevel: z.string().optional(),
      extras: z.array(z.object({ id: z.string(), name: z.string(), price: z.number() }).strict()),
      specialInstructions: z.string().optional(),
    })
    .strict()
    .nullable()
    .optional(),
}).strict();

export const kdsMarkItemsSchema = z.object({
  orderId: z.string().uuid("El ID de la orden es obligatorio"),
  itemIds: z.array(z.string().uuid("Cada ID de item debe ser un UUID válido")).min(1, "Se requiere al menos un item"),
}).strict();

export const cancelOrderItemsSchema = z.object({
  itemIds: z.array(z.string().uuid("Cada ID de item debe ser un UUID válido")).min(1, "Se requiere al menos un item"),
}).strict();

// ── Tables ──

export const tableSchema = z.object({
  number: z.string().min(1, "El número de mesa es obligatorio").max(50, "El número de mesa debe tener máximo 50 caracteres"),
  capacity: z.number().int("La capacidad debe ser un número entero").min(0, "La capacidad mínima es 0").max(50, "La capacidad máxima es 50"),
  base_seats: z.number().int("Los asientos base deben ser un número entero").optional(),
  status: z.enum(["free", "occupied", "billing", "reserved", "closed"], { errorMap: () => ({ message: "El estado debe ser: free, occupied, billing, reserved o closed" }) }).default("free"),
  section: z.string().optional(),
  is_active: z.boolean().default(true),
  current_guests: z.number().int("Los comensales deben ser un número entero").nullable().optional(),
  currentOrderId: z.string().uuid("El ID de orden debe ser un UUID válido").nullable().optional(),
  isJoined: z.boolean().optional(),
  joinedTableIds: z.array(z.string()).optional(),
  totalCuenta: z.number().optional(),
  originalConfig: z.object({
    number: z.string(),
    capacity: z.number(),
    base_seats: z.number().optional(),
  }).nullable().optional(),
}).strict();

// V9-SEC-05: id obligatorio. `status` solo como filtro extra (chequeo optimista
// de handleOpenTable: {id, status:"free"}), nunca como único filtro → sin bulk.
export const tableUpdateSchema = z.object({
  filters: z.object({
    id: z.string().uuid("El ID debe ser un UUID válido"),
    status: z.enum(["free", "occupied", "billing", "reserved", "closed"]).optional(),
  }),
  updates: tableSchema.partial().strict(),
}).strict();

export const tableDeleteSchema = z.object({
  eq: z.object({
    id: z.string().uuid("El ID debe ser un UUID válido"),
  }).strict().optional(),
  ids: z.array(z.string().uuid("Cada ID debe ser un UUID válido")).min(1, "Se requiere al menos un ID").optional(),
}).strict().refine((obj) => obj.eq?.id || (obj.ids && obj.ids.length > 0), {
  message: "Se requiere id o ids para eliminar",
});

// ── Restaurant Config ──
// Campos nuevos del módulo Config van opcionales: `use-restaurant-config` parsea
// filas parciales con configSchema.extend({id}).strip() — un campo requerido
// nuevo rompería Mesas. La coherencia (tax_enabled ⇒ tax_rate) se valida
// post-merge en el PATCH, no en el schema (el update es parcial).

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser un hex #rrggbb");

const timeHHmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "El horario debe tener formato HH:mm (24h)");

const scheduleDaySchema = z
  .object({
    open: timeHHmmSchema,
    close: timeHHmmSchema,
    closed: z.boolean().default(false),
  })
  .strict()
  .refine((day) => day.closed || day.open !== day.close, {
    message: "La apertura y el cierre no pueden ser iguales",
    path: ["close"],
  });

export const scheduleSchema = z
  .object({
    "0": scheduleDaySchema.optional(),
    "1": scheduleDaySchema.optional(),
    "2": scheduleDaySchema.optional(),
    "3": scheduleDaySchema.optional(),
    "4": scheduleDaySchema.optional(),
    "5": scheduleDaySchema.optional(),
    "6": scheduleDaySchema.optional(),
  })
  .strict();

const channelSchema = z
  .object({
    enabled: z.boolean(),
    eta_text: z.string().max(60, "El tiempo estimado debe tener máximo 60 caracteres").default(""),
    min_order: z.number().min(0, "El pedido mínimo debe ser mayor o igual a 0").default(0),
    fee: z.number().min(0, "El costo de envío debe ser mayor o igual a 0").default(0),
  })
  .strict();

export const channelsSchema = z
  .object({
    delivery: channelSchema.optional(),
    pickup: channelSchema.optional(),
  })
  .strict();

export const heroSlideSchema = z
  .object({
    image_url: z.string().url("La imagen del slide debe ser una URL válida").max(500),
    title: z.string().min(1, "El título del slide es obligatorio").max(60, "El título debe tener máximo 60 caracteres"),
    subtitle: z.string().max(60, "El subtítulo debe tener máximo 60 caracteres").optional(),
    description: z.string().max(200, "La descripción debe tener máximo 200 caracteres").optional(),
  })
  .strict();

export const brandColorsSchema = z
  .object({
    primary: hexColorSchema,
    accent: hexColorSchema,
  })
  .strict();

const socialsSchema = z
  .object({
    facebook: z.string().url("La URL de Facebook debe ser válida").max(300).optional(),
    instagram: z.string().url("La URL de Instagram debe ser válida").max(300).optional(),
    tiktok: z.string().url("La URL de TikTok debe ser válida").max(300).optional(),
  })
  .strict();

export const opsSchema = z
  .object({
    sla_green_min: z.number().int("El umbral verde debe ser un número entero").min(1, "El umbral verde debe ser mayor o igual a 1").max(120),
    sla_yellow_min: z.number().int("El umbral amarillo debe ser un número entero").min(1, "El umbral amarillo debe ser mayor o igual a 1").max(240),
    caja_window_hours: z.number().int("La ventana de caja debe ser un número entero").min(1, "La ventana de caja debe ser mayor o igual a 1").max(720),
  })
  .strict()
  .refine((ops) => ops.sla_green_min < ops.sla_yellow_min, {
    message: "El umbral verde debe ser menor que el amarillo",
    path: ["sla_yellow_min"],
  });

export const timezoneSchema = z
  .string()
  .min(1, "La zona horaria es obligatoria")
  .max(64, "La zona horaria debe tener máximo 64 caracteres")
  .refine((tz) => {
    try {
      new Date().toLocaleString("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "La zona horaria no es un identificador IANA válido (ej. America/Mexico_City)");

export const configSchema = z.object({
  sillas_respaldo: z.number().int("Las sillas de respaldo deben ser un número entero").min(0, "Las sillas de respaldo deben ser mayor o igual a 0"),
  total_mesas: z.number().int("El total de mesas debe ser un número entero").min(0, "El total de mesas debe ser mayor o igual a 0").nullable().optional(),
  total_sillas: z.number().int("El total de sillas debe ser un número entero").min(0, "El total de sillas debe ser mayor o igual a 0").nullable().optional(),
  // Identidad
  name: z.string().min(1, "El nombre es obligatorio").max(80, "El nombre debe tener máximo 80 caracteres").optional(),
  slogan: z.string().max(160, "El lema debe tener máximo 160 caracteres").optional(),
  logo_url: z.string().url("El logo debe ser una URL válida").max(500).nullable().optional(),
  hero_slides: z.array(heroSlideSchema).max(8, "El carrusel admite máximo 8 slides").optional(),
  brand_colors: brandColorsSchema.optional(),
  // Contacto
  phone: z.string().max(30, "El teléfono debe tener máximo 30 caracteres").optional(),
  whatsapp_number: z.string().regex(/^\d{10,15}$/, "El WhatsApp debe ser solo dígitos (10-15), ej. 521234567890").nullable().optional(),
  address: z.string().max(200, "La dirección debe tener máximo 200 caracteres").optional(),
  maps_embed_url: z.string().url("La URL del mapa debe ser válida").max(2000).nullable().optional(),
  socials: socialsSchema.optional(),
  // Horarios
  timezone: timezoneSchema.optional(),
  schedule: scheduleSchema.optional(),
  closed_until: z.string().datetime({ offset: true, message: "closed_until debe ser una fecha ISO válida" }).nullable().optional(),
  // Canales
  web_orders_enabled: z.boolean().optional(),
  channels: channelsSchema.optional(),
  // Impuestos
  tax_enabled: z.boolean().optional(),
  tax_rate: z.number().min(0, "La tasa debe ser mayor o igual a 0").max(1, "La tasa debe ser menor o igual a 1 (0.16 = 16%)").nullable().optional(),
  tax_label: z.string().max(20, "La etiqueta del impuesto debe tener máximo 20 caracteres").optional(),
  rfc: z.string().max(13, "El RFC debe tener máximo 13 caracteres").nullable().optional(),
  razon_social: z.string().max(200, "La razón social debe tener máximo 200 caracteres").nullable().optional(),
  ticket_footer: z.string().max(500, "El pie de ticket debe tener máximo 500 caracteres").optional(),
  // Operación
  ops: opsSchema.optional(),
}).strict();

export const configUpdateSchema = z.object({
  filters: z.object({
    id: z.string().uuid("El ID debe ser un UUID válido").optional(),
  }).refine((obj) => Object.keys(obj).length > 0, { message: "Se requiere al menos un filtro para actualizar" }),
  updates: configSchema.partial().strict(),
}).strict();

// ── z.infer convenience types ──

export type ProductInput = z.infer<typeof productSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type OrderStatusTransitionInput = z.infer<typeof orderStatusTransitionSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type TableInput = z.infer<typeof tableSchema>;
export type ConfigInput = z.infer<typeof configSchema>;
export type HeroSlideInput = z.infer<typeof heroSlideSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type ChannelsInput = z.infer<typeof channelsSchema>;
export type CustomerInfoInput = z.infer<typeof customerInfoSchema>;
export type KdsMarkItemsInput = z.infer<typeof kdsMarkItemsSchema>;

// ── Table Distribution RPC ──

export const distributeSchema = z.object({
  tableId: z.string().uuid("El ID de mesa debe ser un UUID válido"),
  capacity: z.number().int("La capacidad debe ser un número entero").min(0, "La capacidad mínima es 0"),
  currentGuests: z.number().int("Los comensales deben ser un número entero").min(0, "Los comensales deben ser mayor o igual a 0"),
  section: z.string().max(50, "La sección debe tener máximo 50 caracteres"),
  cascadeIds: z.array(z.string().uuid("Cada ID de cascada debe ser un UUID válido")),
  cascadeCapacities: z.array(z.number().int("Cada capacidad de cascada debe ser un número entero").min(0)),
  cascadeIsActive: z.array(z.boolean()),
  configId: z.string().uuid("El ID de configuración debe ser un UUID válido").nullable(),
  sillasRespaldo: z.number().int("Las sillas de respaldo deben ser un número entero").min(0, "Las sillas de respaldo deben ser mayor o igual a 0"),
}).strict().refine(
  (obj) => obj.cascadeIds.length === obj.cascadeCapacities.length && obj.cascadeIds.length === obj.cascadeIsActive.length,
  { message: "Los arrays de cascada deben tener la misma longitud", path: ["cascadeIds"] },
);

// ── Checkout RPC ──

// V9-DB-04: el método de pago se persiste en orders.payment_method.
export const checkoutSchema = z.object({
  tableId: z.string().uuid("El ID de mesa debe ser un UUID válido"),
  paymentMethod: z.enum(["cash", "card", "transfer"], {
    errorMap: () => ({ message: "El método de pago debe ser: cash, card o transfer" }),
  }),
}).strict();

// Caja: cobro de una orden individual (take-away/delivery o una comanda de mesa).
export const orderCheckoutSchema = z.object({
  orderId: z.string().uuid("El ID de orden debe ser un UUID válido"),
  paymentMethod: z.enum(["cash", "card", "transfer"], {
    errorMap: () => ({ message: "El método de pago debe ser: cash, card o transfer" }),
  }),
}).strict();

export type OrderCheckoutInput = z.infer<typeof orderCheckoutSchema>;

// ── Login (proxy con rate limiting) ──

export const loginSchema = z.object({
  pin: z.string().length(6, "El PIN debe tener 6 dígitos").regex(/^\d{6}$/, "El PIN solo debe contener números"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Staff (módulo Personal, admin-only) ──

const staffPin = loginSchema.shape.pin;
const staffRole = z.enum(["admin", "waiter", "kitchen", "cashier"], {
  errorMap: () => ({ message: "El rol debe ser: admin, waiter, kitchen o cashier" }),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(50, "El nombre debe tener máximo 50 caracteres"),
  role: staffRole,
  pin: staffPin,
}).strict();

// pin opcional: solo se re-hashea si viene (reset). updates debe traer ≥1 campo.
export const staffUpdateSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  updates: z.object({
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(50, "El nombre debe tener máximo 50 caracteres"),
    role: staffRole,
    is_active: z.boolean(),
    pin: staffPin,
  }).partial().strict().refine(
    (obj) => Object.keys(obj).length > 0,
    { message: "Debe incluir al menos un campo a actualizar" },
  ),
}).strict();

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

// ── Inventario (módulo Logística) ──

export const supplyUnits = ["kg", "g", "l", "ml", "pza"] as const;

const supplyUnit = z.enum(supplyUnits, {
  errorMap: () => ({ message: "La unidad debe ser: kg, g, l, ml o pza" }),
});

const supplyName = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(80, "El nombre debe tener máximo 80 caracteres");

const supplyQty = z
  .number()
  .positive("La cantidad debe ser mayor a 0")
  .max(1_000_000, "La cantidad es demasiado grande");

const movementReason = z
  .string()
  .trim()
  .max(200, "La razón debe tener máximo 200 caracteres")
  .optional();

export const supplyCreateSchema = z.object({
  name: supplyName,
  unit: supplyUnit,
  stock_min: z.number().min(0, "El mínimo no puede ser negativo").max(1_000_000, "El mínimo es demasiado grande").default(0),
}).strict();

export const supplyUpdateSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  updates: z.object({
    name: supplyName,
    unit: supplyUnit,
    stock_min: z.number().min(0, "El mínimo no puede ser negativo").max(1_000_000, "El mínimo es demasiado grande"),
    is_active: z.boolean(),
  }).partial().strict().refine(
    (obj) => Object.keys(obj).length > 0,
    { message: "Debe incluir al menos un campo a actualizar" },
  ),
}).strict();

export const supplyMovementSchema = z.object({
  supply_id: z.string().uuid("El ID del insumo debe ser un UUID válido"),
  type: z.enum(["in", "out", "waste"], {
    errorMap: () => ({ message: "El tipo debe ser: in, out o waste" }),
  }),
  quantity: supplyQty,
  reason: movementReason,
}).strict();

export const supplyCountSchema = z.object({
  supply_id: z.string().uuid("El ID del insumo debe ser un UUID válido"),
  counted: z.number().min(0, "El conteo no puede ser negativo").max(1_000_000, "El conteo es demasiado grande"),
  reason: movementReason,
}).strict();

export const recipeSetSchema = z.object({
  product_id: z.string().uuid("El ID del producto debe ser un UUID válido"),
  lines: z
    .array(
      z.object({
        size_id: z.string().trim().min(1).max(80).nullable().optional(),
        supply_id: z.string().uuid("El ID del insumo debe ser un UUID válido"),
        quantity: supplyQty,
      }).strict(),
    )
    .max(60, "La receta no puede tener más de 60 líneas")
    .refine(
      (lines) => new Set(lines.map((l) => `${l.size_id ?? ""}|${l.supply_id}`)).size === lines.length,
      { message: "Hay líneas duplicadas (misma talla e insumo)" },
    ),
}).strict();

export type SupplyCreateInput = z.infer<typeof supplyCreateSchema>;
export type SupplyUpdateInput = z.infer<typeof supplyUpdateSchema>;
export type SupplyMovementInput = z.infer<typeof supplyMovementSchema>;
export type SupplyCountInput = z.infer<typeof supplyCountSchema>;
export type RecipeSetInput = z.infer<typeof recipeSetSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
