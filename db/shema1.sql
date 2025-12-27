-- =======================================================
-- EXTENSIONS
-- =======================================================
create extension if not exists "uuid-ossp";

-- =======================================================
-- USERS & PROFILES (Supabase Auth + Role Mgmt)
-- =======================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('operator','engineer','admin','manager')) default 'operator',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute procedure public.set_updated_at();

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

-- =======================================================
-- MACHINE MASTER (missing in Supabase schema)
-- =======================================================
create table if not exists public.machine_master (
  machine_no text primary key,
  manufacturer text not null,
  bu_name text not null
);

-- =======================================================
-- ASSETS MASTER
-- =======================================================
create table if not exists public.assets_master (
  id bigserial primary key,
  asset_code text unique not null,
  asset_name text not null,
  machine_no text references public.machine_master(machine_no),
  location text,
  category text,
  manufacturer text,
  model text,
  serial_number text,
  install_date date,
  status text check (status in ('ACTIVE','UNDER_AMC','INACTIVE','DISPOSED')) default 'ACTIVE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_assets_master_updated on public.assets_master;
create trigger trg_assets_master_updated
before update on public.assets_master
for each row execute procedure public.set_updated_at();

-- =======================================================
-- SHIFT TABLE
-- =======================================================
create table if not exists public.shift_table (
  shift_code char(1) primary key,
  shift_from time not null,
  shift_to time not null
);

insert into public.shift_table (shift_code, shift_from, shift_to)
values
  ('A', '07:00:00', '15:00:00'),
  ('B', '15:00:00', '23:00:00'),
  ('C', '23:00:00', '07:00:00')
on conflict do nothing;

-- =======================================================
-- PREVENTIVE MAINTENANCE
-- =======================================================
create table if not exists public.pm_schedule (
  id bigserial primary key,
  asset_id bigint not null references public.assets_master(id) on delete cascade,
  title text not null,
  frequency text check (frequency in ('DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY')),
  due_date date,
  last_completed_at timestamptz,
  checklist jsonb default '[]'::jsonb,
  status text check (status in ('PENDING','DUE','COMPLETED','OVERDUE')) default 'PENDING',
  responsible_person uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pm_compliance (
  id bigserial primary key,
  pm_id bigint references public.pm_schedule(id) on delete cascade,
  compliance_date date not null,
  bu_name text not null,
  shift_code char(1) references public.shift_table(shift_code),
  remarks text
);

-- =======================================================
-- BREAKDOWN LOGS
-- =======================================================
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

-- =======================================================
-- DAILY ENTRY (detailed operator + engineer)
-- =======================================================
create table if not exists public.daily_entry_operator (
  id bigserial primary key,
  breakdown_id bigint references public.breakdown_logs(id) on delete cascade,
  asset_id bigint references public.assets_master(id) on delete set null,
  shift char(1) references public.shift_table(shift_code),
  production_opening_time time,
  entry_date date default current_date,
  entry_time time default current_time,
  machine_no text references public.machine_master(machine_no),
  bu_name text,
  operator_name text,
  status_type text check (status_type in ('BD','OFFLINE','PM')),
  equipment_type text check (equipment_type in ('AUX','MOLD','MACHINE')),
  key_issue text,
  nature_of_complaint text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.daily_entry_engineer (
  id bigserial primary key,
  breakdown_id bigint references public.breakdown_logs(id) on delete cascade,
  asset_id bigint references public.assets_master(id) on delete set null,
  action_taken text,
  engineer_findings text,
  spare_part_use text,
  responsible_person uuid references auth.users(id),
  job_completion_date date,
  done_time time,
  remarks text,
  memo_taken text,
  work_done text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create or replace view public.daily_entry as
select 
  coalesce(o.breakdown_id, e.breakdown_id) as breakdown_id,
  coalesce(o.asset_id, e.asset_id) as asset_id,
  o.shift, o.production_opening_time, o.entry_date, o.entry_time,
  o.machine_no, o.bu_name, o.operator_name,
  o.status_type, o.equipment_type, o.key_issue, o.nature_of_complaint,
  o.note as operator_note, o.created_at as operator_ts,
  e.action_taken, e.engineer_findings, e.spare_part_use,
  e.responsible_person, e.job_completion_date, e.done_time,
  e.remarks, e.memo_taken, e.work_done, e.created_at as engineer_ts
from public.daily_entry_operator o
full join public.daily_entry_engineer e on o.breakdown_id = e.breakdown_id;

-- =======================================================
-- SPARE PARTS INVENTORY & TRANSACTIONS
-- =======================================================
create table if not exists public.spare_parts_inventory (
  id bigserial primary key,
  part_code text unique not null,
  part_name text not null,
  part_no text unique,
  uom text default 'NOS',
  stock_on_hand numeric(14,3) default 0,
  min_level int default 0,
  reorder_level int default 0,
  location text,
  unit_cost numeric(10,2),
  supplier text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

-- Spare issue/return view with balance
create or replace view public.spare_issue_return as
select t.id as transaction_id,
       t.created_at as transaction_date,
       t.part_id,
       p.part_name,
       t.qty,
       t.direction,
       coalesce(sum(case when t2.direction='ISSUE' then t2.qty else -t2.qty end)
                over (partition by t.part_id order by t.created_at),0) as balance,
       t.asset_id,
       t.related_breakdown_id
from public.spare_txn t
join public.spare_parts_inventory p on t.part_id = p.id;

-- =======================================================
-- UTILITIES MONITORING
-- =======================================================
create table if not exists public.utilities_log (
  id bigserial primary key,
  utility_type text check (utility_type in ('POWER','GAS','WATER','AIR')) not null,
  meter_point text,
  reading numeric(18,3) not null,
  reading_at timestamptz not null default now(),
  created_at timestamptz default now()
);

-- =======================================================
-- ASSET QR CODES
-- =======================================================
create table if not exists public.asset_qr (
  id bigserial primary key,
  asset_id bigint unique references public.assets_master(id) on delete cascade,
  qr_payload text not null,
  created_at timestamptz default now()
);

-- =======================================================
-- Enable RLS for all tables (policies should be tightened)
-- =======================================================
alter table public.profiles enable row level security;
alter table public.assets_master enable row level security;
alter table public.machine_master enable row level security;
alter table public.pm_schedule enable row level security;
alter table public.pm_compliance enable row level security;
alter table public.breakdown_logs enable row level security;
alter table public.daily_entry_operator enable row level security;
alter table public.daily_entry_engineer enable row level security;
alter table public.spare_parts_inventory enable row level security;
alter table public.spare_txn enable row level security;
alter table public.utilities_log enable row level security;
alter table public.asset_qr enable row level security;
