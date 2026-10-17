-- Actividad por mesa + GC de mesas abandonadas (solo repo demo).
-- `tables` no tiene updated_at: para distinguir una mesa ocupada EN USO de una
-- abandonada (p. ej. abierta a mano y dejada atrás), la capa demo registra el
-- último cambio de cada mesa usando el trigger que ya existía.

create table if not exists public.demo_table_activity (
  table_id uuid primary key references public.tables(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

-- Como demo_table_claims: sin acceso de clientes, solo service_role.
alter table public.demo_table_activity enable row level security;
revoke all on public.demo_table_activity from public, anon, authenticated;
grant all on public.demo_table_activity to service_role;

-- El trigger de cambios de mesa ahora marca también la actividad (además del
-- heartbeat de claims que ya hacía). Se dispara con cualquier UPDATE de `tables`
-- (abrir la mesa, asignar sillas, cobrar, etc.).
create or replace function public.demo_touch_claim_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.demo_table_claims set last_seen_at = now() where table_id = new.id;

  insert into public.demo_table_activity (table_id, last_seen_at)
  values (new.id, now())
  on conflict (table_id) do update set last_seen_at = excluded.last_seen_at;

  return new;
end;
$$;

-- GC: además de liberar claims vencidos y cancelar órdenes viejas, libera mesas
-- ocupadas que nadie reclama ni usa: sin claim, sin orden activa, fuera de un
-- grupo de mesas unidas y sin cambios en la última hora (mismo umbral que el TTL
-- de claim de la demo, DEMO_CLAIM_TTL_MINUTES = 60).
create or replace function public.demo_gc()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  -- Serializa ejecuciones concurrentes del GC.
  perform pg_advisory_xact_lock(hashtext('demo_gc'));

  for r in
    select session_id
      from public.demo_table_claims
     where last_seen_at < now() - interval '60 minutes'
  loop
    perform public.demo_release_table(r.session_id);
  end loop;

  update public.tables t
     set status = 'free',
         current_guests = 0
   where t.status <> 'free'
     and not t."isJoined"
     and coalesce(array_length(t."joinedTableIds", 1), 0) = 0
     and not exists (
       select 1 from public.demo_table_claims c where c.table_id = t.id
     )
     and not exists (
       select 1 from public.orders o
        where o.table_id = t.id
          and o.status in ('pending', 'confirmed', 'preparing', 'ready', 'on-the-way')
     )
     and coalesce(
           (select a.last_seen_at from public.demo_table_activity a where a.table_id = t.id),
           t.created_at
         ) < now() - interval '1 hour';

  update public.orders
     set status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = coalesce(cancel_reason, 'demo-gc')
   where status in ('pending', 'confirmed', 'preparing', 'ready', 'on-the-way')
     and created_at < now() - interval '24 hours';
end;
$$;
