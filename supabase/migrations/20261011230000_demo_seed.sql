-- Demo seed — datos genéricos para la demo pública (sin marca ni datos de negocio real).
-- Idempotente: re-ejecutable (ON CONFLICT / guards) para `db reset` y replays.
-- Solo vive en este repo (demo); el proyecto original no lo tiene.

-- ── Mesas (8, 4 asientos; layout default) ───────────────────────────────────
INSERT INTO public.tables (id, number, capacity, base_seats, section, position)
VALUES
  ('f0000000-0000-4000-8000-000000000001', '1', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb),
  ('f0000000-0000-4000-8000-000000000002', '2', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb),
  ('f0000000-0000-4000-8000-000000000003', '3', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb),
  ('f0000000-0000-4000-8000-000000000004', '4', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb),
  ('f0000000-0000-4000-8000-000000000005', '5', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb),
  ('f0000000-0000-4000-8000-000000000006', '6', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb),
  ('f0000000-0000-4000-8000-000000000007', '7', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb),
  ('f0000000-0000-4000-8000-000000000008', '8', 4, 4, 'General', '{"x": 0, "y": 0}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── Config del restaurante (identidad genérica de demo) ─────────────────────
UPDATE public.restaurant_config
SET
  name = 'Sazón de Casa',
  slogan = 'Cocina de casa, hecha al momento.',
  logo_url = NULL,
  hero_slides = '[
    {
      "title": "Cocina al Momento",
      "subtitle": "Ingredientes Frescos",
      "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&q=80",
      "description": "Platillos preparados al momento, directo de la cocina a tu mesa."
    },
    {
      "title": "Para Compartir",
      "subtitle": "Antojos de la Casa",
      "image_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1920&q=80",
      "description": "Entradas y botanas ideales para abrir el apetito."
    },
    {
      "title": "Sabor del Mar",
      "subtitle": "Recetas de la Casa",
      "image_url": "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=1920&q=80",
      "description": "Ceviches y aguachiles con el toque fresco que nos distingue."
    }
  ]'::jsonb,
  brand_colors = '{"primary": "#26282B", "accent": "#C81E1E"}'::jsonb,
  phone = '+52 55 1234 5678',
  whatsapp_number = '525512345678',
  address = 'Av. Reforma 123, Col. Centro, Ciudad de México',
  timezone = 'America/Mexico_City',
  total_mesas = 8,
  total_sillas = 32,
  sillas_respaldo = 0,
  web_orders_enabled = true,
  tax_enabled = false,
  updated_at = now();

-- ── Insumos + carga inicial en el libro ─────────────────────────────────────
INSERT INTO public.supplies (id, name, unit, stock_current, stock_min)
VALUES
  ('50000000-0000-4000-8000-000000000001', 'Camarón crudo', 'kg', 12, 3),
  ('50000000-0000-4000-8000-000000000002', 'Limón', 'kg', 8, 2),
  ('50000000-0000-4000-8000-000000000003', 'Cebolla morada', 'kg', 6, 1.5),
  ('50000000-0000-4000-8000-000000000004', 'Pepino', 'kg', 5, 1),
  ('50000000-0000-4000-8000-000000000005', 'Tortilla de maíz', 'pza', 300, 60),
  ('50000000-0000-4000-8000-000000000006', 'Tostadas', 'pza', 150, 40),
  ('50000000-0000-4000-8000-000000000007', 'Queso', 'kg', 4, 1),
  ('50000000-0000-4000-8000-000000000008', 'Aguacate', 'kg', 5, 1.5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.supply_movements (supply_id, type, quantity, stock_after, reason)
SELECT s.id, 'in', s.stock_current, s.stock_current, 'Carga inicial demo'
FROM public.supplies s
WHERE s.id::text LIKE '50000000-0000-4000-8000-00000000000%'
  AND NOT EXISTS (SELECT 1 FROM public.supply_movements m WHERE m.supply_id = s.id);

-- ── Menú (productos genéricos) ──────────────────────────────────────────────
INSERT INTO public.products (
  id, name, description, "basePrice", category, image, available,
  "preparationTime", "hasSizes", sizes, "hasSauces", sauces,
  "hasExtras", extras, "hasSpiceLevel", "spiceLevels", is_active
)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'Aguachile Tradicional',
    'Camarón fresco curtido en limón con pepino, cebolla morada y salsa a elegir.',
    180, 'Aguachiles',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', true, 15,
    true,
    '[{"id": "b0000000-0000-4000-8000-000000000001", "name": "Medio Litro", "price": 180},
      {"id": "b0000000-0000-4000-8000-000000000002", "name": "Litro Completo", "price": 260}]'::jsonb,
    true,
    '[{"id": "c0000000-0000-4000-8000-000000000001", "name": "Verde (Serrano)", "price": 0},
      {"id": "c0000000-0000-4000-8000-000000000002", "name": "Negra (Salsas Negras)", "price": 0},
      {"id": "c0000000-0000-4000-8000-000000000003", "name": "Roja (Habanero)", "price": 0}]'::jsonb,
    true,
    '[{"id": "d0000000-0000-4000-8000-000000000001", "name": "Orden Extra de Tostadas", "price": 15},
      {"id": "d0000000-0000-4000-8000-000000000002", "name": "Aguacate Extra", "price": 25},
      {"id": "d0000000-0000-4000-8000-000000000003", "name": "Porción Extra de Camarón", "price": 60}]'::jsonb,
    true,
    '[{"id": "e0000000-0000-4000-8000-000000000001", "name": "No pica", "price": 0},
      {"id": "e0000000-0000-4000-8000-000000000002", "name": "Picor Medio", "price": 0},
      {"id": "e0000000-0000-4000-8000-000000000003", "name": "Picor Alto", "price": 0},
      {"id": "e0000000-0000-4000-8000-000000000004", "name": "Extremo (Súper Picante)", "price": 0}]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Ceviche Mixto',
    'Mezcla de camarón, pulpo y pescado en julianas de cebolla y cilantro.',
    65, 'Ceviches',
    'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3', true, 12,
    true,
    '[{"id": "b0000000-0000-4000-8000-000000000011", "name": "Tostada Individual", "price": 65},
      {"id": "b0000000-0000-4000-8000-000000000012", "name": "Orden Chica (500 g)", "price": 160},
      {"id": "b0000000-0000-4000-8000-000000000013", "name": "Orden Grande (1 kg)", "price": 290}]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true,
    '[{"id": "e0000000-0000-4000-8000-000000000011", "name": "Sin Chile", "price": 0},
      {"id": "e0000000-0000-4000-8000-000000000012", "name": "Chile Moderado", "price": 0},
      {"id": "e0000000-0000-4000-8000-000000000013", "name": "Bien Picante", "price": 0}]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'Taco Gobernador',
    'Taco de camarón guisado con pimiento, cebolla y queso gratinado en tortilla de maíz a la plancha.',
    55, 'Tacos & Quesadillas',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47', true, 10,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true,
    '[{"id": "d0000000-0000-4000-8000-000000000011", "name": "Queso Extra", "price": 15},
      {"id": "d0000000-0000-4000-8000-000000000012", "name": "Tortilla de Harina", "price": 5},
      {"id": "d0000000-0000-4000-8000-000000000013", "name": "Tiradito de Pulpo Extra", "price": 35}]'::jsonb,
    false, '[]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    'Quesadilla de Camarón',
    'Tortilla a la plancha con queso gratinado y camarón guisado.',
    75, 'Tacos & Quesadillas',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47', true, 10,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true,
    '[{"id": "d0000000-0000-4000-8000-000000000021", "name": "Queso Extra", "price": 15},
      {"id": "d0000000-0000-4000-8000-000000000022", "name": "Camarón Extra", "price": 50}]'::jsonb,
    false, '[]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000005',
    'Tostada de Ceviche',
    'Tostada crujiente con ceviche de camarón, aguacate y cilantro.',
    70, 'Ceviches',
    'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3', true, 8,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true,
    '[{"id": "e0000000-0000-4000-8000-000000000011", "name": "Sin Chile", "price": 0},
      {"id": "e0000000-0000-4000-8000-000000000012", "name": "Chile Moderado", "price": 0},
      {"id": "e0000000-0000-4000-8000-000000000013", "name": "Bien Picante", "price": 0}]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000006',
    'Totopos con Guacamole',
    'Totopos de maíz con guacamole fresco y pico de gallo.',
    65, 'Entradas',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836', true, 6,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000007',
    'Cerveza Clara',
    'Cerveza clara de 355 ml bien fría.',
    45, 'Bebidas',
    'https://images.unsplash.com/photo-1608270586620-248524c67de9', true, 2,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true,
    '[{"id": "d0000000-0000-4000-8000-000000000031", "name": "Preparada tipo Michelada", "price": 20},
      {"id": "d0000000-0000-4000-8000-000000000032", "name": "Clamato Preparado", "price": 30}]'::jsonb,
    false, '[]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000008',
    'Agua de Horchata',
    'Agua fresca de arroz con canela, servida bien fría.',
    35, 'Bebidas',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836', true, 3,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000009',
    'Limonada Mineral',
    'Limonada con agua mineral, hielo y un toque de menta.',
    40, 'Bebidas',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836', true, 3,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    false, '[]'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ── Recetas (descuento automático de insumos por venta) ─────────────────────
-- Productos con tallas usan filas por talla (el match ignora la base cuando
-- existe fila del tamaño); el resto usa receta base (size_id NULL).
INSERT INTO public.recipes (product_id, size_id, supply_id, quantity)
VALUES
  -- Aguachile Tradicional
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 0.15),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 0.1),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 0.03),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000004', 0.05),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000006', 6),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 0.3),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 0.2),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', 0.06),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000004', 0.1),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000006', 12),
  -- Ceviche Mixto
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000001', 0.05),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000002', 0.03),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000003', 0.02),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000001', 0.15),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000002', 0.08),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000003', 0.05),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000004', 0.03),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000001', 0.3),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000002', 0.15),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000003', 0.1),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000004', 0.06),
  -- Taco Gobernador (base)
  ('a0000000-0000-4000-8000-000000000003', NULL, '50000000-0000-4000-8000-000000000001', 0.05),
  ('a0000000-0000-4000-8000-000000000003', NULL, '50000000-0000-4000-8000-000000000005', 2),
  ('a0000000-0000-4000-8000-000000000003', NULL, '50000000-0000-4000-8000-000000000007', 0.03),
  ('a0000000-0000-4000-8000-000000000003', NULL, '50000000-0000-4000-8000-000000000003', 0.01),
  -- Quesadilla de Camarón (base)
  ('a0000000-0000-4000-8000-000000000004', NULL, '50000000-0000-4000-8000-000000000005', 2),
  ('a0000000-0000-4000-8000-000000000004', NULL, '50000000-0000-4000-8000-000000000007', 0.08),
  ('a0000000-0000-4000-8000-000000000004', NULL, '50000000-0000-4000-8000-000000000001', 0.05),
  -- Tostada de Ceviche (base)
  ('a0000000-0000-4000-8000-000000000005', NULL, '50000000-0000-4000-8000-000000000001', 0.06),
  ('a0000000-0000-4000-8000-000000000005', NULL, '50000000-0000-4000-8000-000000000002', 0.04),
  ('a0000000-0000-4000-8000-000000000005', NULL, '50000000-0000-4000-8000-000000000003', 0.02),
  ('a0000000-0000-4000-8000-000000000005', NULL, '50000000-0000-4000-8000-000000000006', 1),
  -- Totopos con Guacamole (base)
  ('a0000000-0000-4000-8000-000000000006', NULL, '50000000-0000-4000-8000-000000000005', 6),
  ('a0000000-0000-4000-8000-000000000006', NULL, '50000000-0000-4000-8000-000000000008', 0.1),
  ('a0000000-0000-4000-8000-000000000006', NULL, '50000000-0000-4000-8000-000000000002', 0.02)
ON CONFLICT DO NOTHING;
