-- ════════════════════════════════════════════════════════════════════════════
--  NexusHR — Supabase schema + Row Level Security
--
--  Principios:
--    * Deny by default: RLS activado en TODAS las tablas; sin política = sin acceso.
--    * El rol `anon` no tiene acceso a ninguna tabla (solo usuarios autenticados).
--    * El rol de la app (employee/manager/admin) vive en public.profiles y SOLO
--      puede cambiarlo un admin. Nunca se lee de user_metadata (editable por el usuario).
--    * Datos sensibles (salario, NSS, IBAN) en tabla aparte (employee_private)
--      porque RLS filtra filas, no columnas.
--    * Funciones SECURITY DEFINER con search_path vacío para evitar hijacking.
--
--  Ejecutar en: Supabase Dashboard → SQL Editor (o `supabase db push`).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tipos ───────────────────────────────────────────────────────────────────
create type public.app_role as enum ('employee', 'manager', 'admin');
create type public.leave_status as enum ('pending', 'approved', 'rejected');

-- ── Tablas ──────────────────────────────────────────────────────────────────

-- Perfil público (directorio de empleados). 1:1 con auth.users.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  email       text unique,                       -- null si el alta es por teléfono
  role        public.app_role not null default 'employee',
  department  text check (char_length(department) <= 80),
  hire_date   date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Datos sensibles: solo el propio empleado y los admin.
create table public.employee_private (
  id            uuid primary key references public.profiles (id) on delete cascade,
  salary        numeric(12, 2) check (salary >= 0),
  ssn           text check (char_length(ssn) <= 32),
  bank_account  text check (char_length(bank_account) <= 34),
  updated_at    timestamptz not null default now()
);

create table public.announcements (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 1 and 200),
  body        text not null check (char_length(body) between 1 and 5000),
  author_id   uuid default auth.uid() references public.profiles (id) on delete set null,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.leave_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  reason       text check (char_length(reason) <= 500),
  status       public.leave_status not null default 'pending',
  reviewed_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint leave_dates_valid check (end_date >= start_date)
);

create index leave_requests_user_id_idx on public.leave_requests (user_id);
create index announcements_author_id_idx on public.announcements (author_id);

-- ── Helpers de autorización ─────────────────────────────────────────────────
-- SECURITY DEFINER para leer profiles sin recursión de RLS.
-- Devuelve NULL si el usuario no existe o está inactivo → todas las políticas fallan.
create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.get_my_role() = 'admin', false)
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.get_my_role() in ('manager', 'admin'), false)
$$;

revoke execute on function public.get_my_role()         from public, anon;
revoke execute on function public.is_admin()            from public, anon;
revoke execute on function public.is_manager_or_admin() from public, anon;
grant  execute on function public.get_my_role()         to authenticated;
grant  execute on function public.is_admin()            to authenticated;
grant  execute on function public.is_manager_or_admin() to authenticated;

-- ── Alta automática de perfil al registrarse ────────────────────────────────
-- El rol SIEMPRE es 'employee'; ignoramos cualquier "role" que venga en metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), 120),
    new.email
  )
  on conflict do nothing;  -- nunca romper el signup por un conflicto (email desincronizado, reintentos)
  insert into public.employee_private (id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene profiles.email sincronizado si el usuario cambia su email en Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ── Búsqueda de empleados (parametrizada, sin filtros PostgREST concatenados) ─
-- SECURITY INVOKER: respeta RLS de profiles.
create or replace function public.search_employees(q text)
returns table (id uuid, full_name text, email text, department text, role public.app_role)
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (
    -- Escapa comodines LIKE para que el usuario no pueda inyectar % o _
    select '%' || replace(replace(replace(left(coalesce(q, ''), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select p.id, p.full_name, p.email, p.department, p.role
  from public.profiles p, term t
  where p.active
    and (p.full_name  ilike t.pattern
      or p.department ilike t.pattern
      or p.email      ilike t.pattern)
  order by p.full_name
  limit 50
$$;

revoke execute on function public.search_employees(text) from public, anon;
grant  execute on function public.search_employees(text) to authenticated;

-- ── RPCs de administración (devuelven datos sensibles ya enmascarados) ──────
create or replace function public.admin_list_users()
returns table (
  id uuid, full_name text, email text, role public.app_role, department text, active boolean,
  salary numeric, ssn_masked text, bank_account_masked text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, p.email, p.role, p.department, p.active,
           ep.salary,
           case when ep.ssn is null then null else '••••' || right(ep.ssn, 4) end,
           case when ep.bank_account is null then null else '••••' || right(ep.bank_account, 4) end
    from public.profiles p
    left join public.employee_private ep on ep.id = p.id
    order by p.full_name;
end;
$$;

create or replace function public.admin_stats()
returns table (total_active bigint, departments bigint, avg_salary numeric, pending_leave bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select
      (select count(*) from public.profiles where active),
      (select count(distinct department) from public.profiles where active),
      (select round(avg(ep.salary)) from public.employee_private ep
         join public.profiles p on p.id = ep.id where p.active and ep.salary > 0),
      (select count(*) from public.leave_requests where status = 'pending');
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_stats()      from public, anon;
grant  execute on function public.admin_list_users() to authenticated;
grant  execute on function public.admin_stats()      to authenticated;

-- ── Privilegios a nivel de tabla/columna (defensa en profundidad) ───────────
revoke all on public.profiles, public.employee_private, public.announcements, public.leave_requests from anon;
revoke all on public.profiles, public.employee_private, public.announcements, public.leave_requests from authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, role, department, hire_date, active) on public.profiles to authenticated;  -- filtrado por RLS: solo admin

grant select (id, salary, updated_at) on public.employee_private to authenticated;               -- ssn/bank_account NO legibles vía API
grant update (salary, ssn, bank_account) on public.employee_private to authenticated;               -- filtrado por RLS: solo admin

grant select, delete on public.announcements to authenticated;
grant insert (title, body, pinned) on public.announcements to authenticated;                        -- author_id lo pone el default
grant update (title, body, pinned) on public.announcements to authenticated;

grant select on public.leave_requests to authenticated;
grant insert (start_date, end_date, reason) on public.leave_requests to authenticated;              -- user_id/status por default
grant update (status, reviewed_by) on public.leave_requests to authenticated;                       -- solo revisión

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.employee_private enable row level security;
alter table public.announcements    enable row level security;
alter table public.leave_requests   enable row level security;
-- Nota: NO usamos FORCE RLS; las funciones SECURITY DEFINER (owner postgres)
-- necesitan leer profiles sin pasar por las políticas para evitar recursión.

-- profiles ─────────────────────────────────────────────────────────────────
-- Directorio visible para cualquier empleado activo.
create policy "profiles_select_active_users"
  on public.profiles for select to authenticated
  using (public.get_my_role() is not null);

-- Solo admin modifica perfiles (incluido el rol). Sin INSERT (lo hace el trigger)
-- ni DELETE (se borra en cascada desde auth.users).
create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- employee_private ─────────────────────────────────────────────────────────
create policy "employee_private_select_own_or_admin"
  on public.employee_private for select to authenticated
  using (
    (id = (select auth.uid()) and public.get_my_role() is not null)
    or public.is_admin()
  );

create policy "employee_private_update_admin"
  on public.employee_private for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- announcements ────────────────────────────────────────────────────────────
create policy "announcements_select_active_users"
  on public.announcements for select to authenticated
  using (public.get_my_role() is not null);

create policy "announcements_insert_admin"
  on public.announcements for insert to authenticated
  with check (public.is_admin() and author_id = (select auth.uid()));

create policy "announcements_update_admin"
  on public.announcements for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "announcements_delete_admin"
  on public.announcements for delete to authenticated
  using (public.is_admin());

-- leave_requests ───────────────────────────────────────────────────────────
-- Cada empleado ve las suyas; manager/admin ven todas.
create policy "leave_select_own_or_reviewer"
  on public.leave_requests for select to authenticated
  using (
    (user_id = (select auth.uid()) and public.get_my_role() is not null)
    or public.is_manager_or_admin()
  );

-- Solo para uno mismo y siempre en estado pendiente.
create policy "leave_insert_own_pending"
  on public.leave_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and public.get_my_role() is not null
  );

-- Manager/admin revisan solicitudes PENDIENTES de otros (nunca las propias).
-- La revisión es de un solo uso: pending → approved|rejected, firmada por quien revisa.
create policy "leave_update_reviewer"
  on public.leave_requests for update to authenticated
  using (
    status = 'pending'
    and user_id <> (select auth.uid())
    and (select public.is_manager_or_admin())
  )
  with check (
    status in ('approved', 'rejected')
    and reviewed_by = (select auth.uid())
    and user_id <> (select auth.uid())
    and (select public.is_manager_or_admin())
  );

-- Sin política DELETE en leave_requests → nadie puede borrar vía API.

-- ════════════════════════════════════════════════════════════════════════════
--  Bootstrap del primer admin (ejecutar manualmente en SQL Editor tras registrarse
--  y CONFIRMAR el email). Se promueve por id y solo si el email está verificado:
--
--    select id, email, email_confirmed_at from auth.users where email = 'tu-admin@empresa.com';
--
--    update public.profiles p set role = 'admin'
--    from auth.users u
--    where p.id = u.id
--      and u.id = '<uuid-del-paso-anterior>'
--      and u.email_confirmed_at is not null;
-- ════════════════════════════════════════════════════════════════════════════
