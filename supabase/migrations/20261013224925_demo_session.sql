-- Demo session isolation (solo repo demo).
-- Reserva de mesa por sesión + reset/GC + heartbeat. No altera el esquema de
-- producto (solo agrega una tabla demo y funciones demo-only).

-- ── Claims por sesión ───────────────────────────────────────────────────────
create table if not exists public.demo_table_claims (
  session_id uuid primary key,
  table_id uuid not null unique references public.tables(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Sin acceso de clientes: solo service_role (bypassa RLS) toca esta tabla.
alter table public.demo_table_claims enable row level security;
revoke all on public.demo_table_claims from public, anon, authenticated;
grant all on public.demo_table_claims to service_role;

-- ── Liberar mesa de una sesión ──────────────────────────────────────────────
create or replace function public.demo_release_table(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table uuid;
begin
  delete from public.demo_table_claims
   where session_id = p_session
  returning table_id into v_table;

  if v_table is null then
    return;
  end if;

  update public.orders
     set status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = coalesce(cancel_reason, 'demo-reset')
   where table_id = v_table
     and status in ('pending', 'confirmed', 'preparing', 'ready', 'on-the-way');

  update public.order_items oi
     set status = 'cancelled'
    from public.orders o
   where oi.order_id = o.id
     and o.table_id = v_table
     and oi.status not in ('cancelled', 'completed');

  update public.tables
     set status = 'free', current_guests = 0
   where id = v_table;
end;
$$;

-- ── Reclamar mesa (atómico) ─────────────────────────────────────────────────
create or replace function public.demo_claim_table(p_session uuid)
returns table(table_id uuid, table_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table uuid;
  v_number text;
begin
  -- Limpia la sesión previa y huérfanos abandonados antes de reservar.
  perform public.demo_release_table(p_session);
  perform public.demo_gc();

  select t.id, t.number
    into v_table, v_number
    from public.tables t
   where t.status = 'free'
     and t.is_active
     and t.capacity > 0
     and not exists (
       select 1 from public.demo_table_claims c where c.table_id = t.id
     )
   order by t.number
   limit 1
   for update skip locked;

  if v_table is null then
    return;
  end if;

  insert into public.demo_table_claims (session_id, table_id)
  values (p_session, v_table);

  table_id := v_table;
  table_number := v_number;
  return next;
end;
$$;

-- ── GC: libera sesiones inactivas y órdenes huérfanas ───────────────────────
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

  update public.orders
     set status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = coalesce(cancel_reason, 'demo-gc')
   where status in ('pending', 'confirmed', 'preparing', 'ready', 'on-the-way')
     and created_at < now() - interval '24 hours';
end;
$$;

-- ── Heartbeat: mantiene fresco el last_seen_at de la sesión activa ──────────
create or replace function public.demo_touch_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.table_id is not null then
    update public.demo_table_claims
       set last_seen_at = now()
     where table_id = new.table_id;
  end if;
  return new;
end;
$$;

drop trigger if exists demo_touch_claim_orders on public.orders;
create trigger demo_touch_claim_orders
  after insert or update on public.orders
  for each row execute function public.demo_touch_claim();

create or replace function public.demo_touch_claim_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.demo_table_claims set last_seen_at = now() where table_id = new.id;
  return new;
end;
$$;

drop trigger if exists demo_touch_claim_tables on public.tables;
create trigger demo_touch_claim_tables
  after update on public.tables
  for each row execute function public.demo_touch_claim_table();

-- ── Permisos: solo service_role ejecuta las funciones demo ──────────────────
revoke all on function public.demo_claim_table(uuid) from public, anon, authenticated;
revoke all on function public.demo_release_table(uuid) from public, anon, authenticated;
revoke all on function public.demo_gc() from public, anon, authenticated;
revoke all on function public.demo_touch_claim() from public, anon, authenticated;
revoke all on function public.demo_touch_claim_table() from public, anon, authenticated;
grant execute on function public.demo_claim_table(uuid) to service_role;
grant execute on function public.demo_release_table(uuid) to service_role;
grant execute on function public.demo_gc() to service_role;

-- ── Programación del GC (opcional: se ignora si pg_cron no está disponible) ──
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron no disponible: %', sqlerrm;
  end;

  begin
    perform cron.schedule('demo-gc', '0 3 * * *', 'select public.demo_gc();');
  exception when others then
    raise notice 'No se pudo programar demo-gc: %', sqlerrm;
  end;
end;
$$;
