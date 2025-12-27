-- Supabase/PostgreSQL schema for MIS (baseline)
-- Note: adjust naming to your standard. Timestamps in UTC.

create extension if not exists "uuid-ossp";

-- Users are managed by Supabase Auth. Optional profile table:
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('operator','engineer','admin')) default 'operator',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles for each row execute procedure public.set_updated_at();

-- Helper functions for RLS
create or replace function public.current_role() returns text language sql stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_role(target text) returns boolean language sql stable as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '') = target;
$$;

create or replace function public.has_any_role(targets text[]) returns boolean language sql stable as $$
  select (select role from public.profiles where id = auth.uid()) = any(targets);
$$;

-- Assets master
create table if not exists public.assets_master (
  id bigserial primary key,
  asset_code text unique not null,
  asset_name text not null,
  location text,
  category text,
  manufacturer text,
  model text,
  serial_number text,
  install_date date,
  status text check (status in ('ACTIVE','INACTIVE','DISPOSED')) default 'ACTIVE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists trg_assets_master_updated on public.assets_master;
create trigger trg_assets_master_updated before update on public.assets_master for each row execute procedure public.set_updated_at();

-- Preventive Maintenance schedule
create table if not exists public.pm_schedule (
  id bigserial primary key,
  asset_id bigint not null references public.assets_master(id) on delete cascade,
  title text not null,
  frequency text, -- e.g. DAILY/WEEKLY/MONTHLY or ISO-8601 interval
  due_date date,
  checklist jsonb default '[]'::jsonb,
  status text check (status in ('PENDING','DUE','COMPLETED','OVERDUE')) default 'PENDING',
  last_completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists trg_pm_schedule_updated on public.pm_schedule;
create trigger trg_pm_schedule_updated before update on public.pm_schedule for each row execute procedure public.set_updated_at();

-- Breakdown logs
create table if not exists public.breakdown_logs (
  id bigserial primary key,
  asset_id bigint references public.assets_master(id) on delete set null,
  description text not null,
  reported_by uuid references auth.users(id),
  acknowledged_by uuid references auth.users(id),
  root_cause text,
  action_taken text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text check (status in ('OPEN','ACK','IN_PROGRESS','RESOLVED','CLOSED')) default 'OPEN',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists trg_breakdown_logs_updated on public.breakdown_logs;
create trigger trg_breakdown_logs_updated before update on public.breakdown_logs for each row execute procedure public.set_updated_at();

-- Spares inventory
create table if not exists public.spare_parts_inventory (
  id bigserial primary key,
  part_code text unique not null,
  part_name text not null,
  uom text default 'NOS',
  stock_on_hand numeric(14,3) default 0,
  reorder_level numeric(14,3) default 0,
  location text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists trg_spares_updated on public.spare_parts_inventory;
create trigger trg_spares_updated before update on public.spare_parts_inventory for each row execute procedure public.set_updated_at();

-- Spare transactions (issue/return)
create table if not exists public.spare_txn (
  id bigserial primary key,
  part_id bigint not null references public.spare_parts_inventory(id) on delete cascade,
  qty numeric(14,3) not null,
  direction text check (direction in ('ISSUE','RETURN')) not null,
  asset_id bigint references public.assets_master(id) on delete set null,
  related_breakdown_id bigint references public.breakdown_logs(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Optional view alias matching SpareIssueReturn naming
create or replace view public.spare_issue_return as
select * from public.spare_txn;

-- Utilities monitoring
create table if not exists public.utilities_log (
  id bigserial primary key,
  utility_type text check (utility_type in ('POWER','GAS','WATER','AIR')) not null,
  meter_point text,
  reading numeric(18,3) not null,
  reading_at timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Daily entry (operator, engineer) and a view
create table if not exists public.daily_entry_operator (
  id bigserial primary key,
  breakdown_id bigint references public.breakdown_logs(id) on delete cascade,
  asset_id bigint references public.assets_master(id) on delete set null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.daily_entry_engineer (
  id bigserial primary key,
  breakdown_id bigint references public.breakdown_logs(id) on delete cascade,
  work_done text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create or replace view public.daily_entry as
select o.breakdown_id,
       o.note as operator_note,
       o.created_at as operator_ts,
       e.work_done as engineer_note,
       e.created_at as engineer_ts
from public.daily_entry_operator o
left join public.daily_entry_engineer e on e.breakdown_id = o.breakdown_id;

-- Asset QR table for scan mapping
create table if not exists public.asset_qr (
  id bigserial primary key,
  asset_id bigint unique references public.assets_master(id) on delete cascade,
  qr_payload text not null,
  created_at timestamptz default now()
);

-- Basic RLS policies (enable and allow authenticated read/write as per roles later)
alter table public.profiles enable row level security;
alter table public.assets_master enable row level security;
alter table public.pm_schedule enable row level security;
alter table public.breakdown_logs enable row level security;
alter table public.spare_parts_inventory enable row level security;
alter table public.spare_txn enable row level security;
alter table public.utilities_log enable row level security;
alter table public.daily_entry_operator enable row level security;
alter table public.daily_entry_engineer enable row level security;

-- Minimal permissive policies (tighten for production)
do $$ begin
  execute 'create policy "profiles self" on public.profiles for select to authenticated using (id = auth.uid())';
  execute 'create policy "profiles admin" on public.profiles for all to authenticated using (public.is_role(''admin'')) with check (public.is_role(''admin''))';
exception when others then null; end $$;

do $$ begin
  execute '';
exception when others then null; end $$;

-- Assets: everyone can read, only admin can write
do $$ begin
  execute 'create policy "assets read" on public.assets_master for select to authenticated using (true)';
  execute 'create policy "assets write admin" on public.assets_master for all to authenticated using (public.is_role(''admin'')) with check (public.is_role(''admin''))';
exception when others then null; end $$;

-- Breakdowns: everyone can read; operator/engineer/admin can insert; engineer/admin can update; admin delete
do $$ begin
  execute 'create policy "breakdown read" on public.breakdown_logs for select to authenticated using (true)';
  execute 'create policy "breakdown insert" on public.breakdown_logs for insert to authenticated with check (public.has_any_role(array[''operator'',''engineer'',''admin'']))';
  execute 'create policy "breakdown update" on public.breakdown_logs for update to authenticated using (public.has_any_role(array[''engineer'',''admin''])) with check (public.has_any_role(array[''engineer'',''admin'']))';
  execute 'create policy "breakdown delete" on public.breakdown_logs for delete to authenticated using (public.is_role(''admin''))';
exception when others then null; end $$;

-- PM: read all; admin write
do $$ begin
  execute 'create policy "pm read" on public.pm_schedule for select to authenticated using (true)';
  execute 'create policy "pm write admin" on public.pm_schedule for all to authenticated using (public.is_role(''admin'')) with check (public.is_role(''admin''))';
exception when others then null; end $$;

-- Spares: read all inventory; admin writes; transactions insert by engineer/admin, read all
do $$ begin
  execute 'create policy "spares read" on public.spare_parts_inventory for select to authenticated using (true)';
  execute 'create policy "spares write admin" on public.spare_parts_inventory for all to authenticated using (public.is_role(''admin'')) with check (public.is_role(''admin''))';
exception when others then null; end $$;

do $$ begin
  execute 'create policy "spare txn read" on public.spare_txn for select to authenticated using (true)';
  execute 'create policy "spare txn insert" on public.spare_txn for insert to authenticated with check (public.has_any_role(array[''engineer'',''admin'']))';
exception when others then null; end $$;

-- Utilities: read all; insert by engineer/admin
do $$ begin
  execute 'create policy "utilities read" on public.utilities_log for select to authenticated using (true)';
  execute 'create policy "utilities insert" on public.utilities_log for insert to authenticated with check (public.has_any_role(array[''engineer'',''admin'']))';
exception when others then null; end $$;

-- Daily entries: insert by operator/engineer/admin, read all
do $$ begin
  execute 'create policy "deo read" on public.daily_entry_operator for select to authenticated using (true)';
  execute 'create policy "deo insert" on public.daily_entry_operator for insert to authenticated with check (public.has_any_role(array[''operator'',''engineer'',''admin'']))';
exception when others then null; end $$;

do $$ begin
  execute 'create policy "dee read" on public.daily_entry_engineer for select to authenticated using (true)';
  execute 'create policy "dee insert" on public.daily_entry_engineer for insert to authenticated with check (public.has_any_role(array[''engineer'',''admin'']))';
exception when others then null; end $$;


