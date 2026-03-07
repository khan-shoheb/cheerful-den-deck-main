-- Run this in Supabase SQL editor

-- Rooms table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text,
  price_per_night numeric,
  status text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bookings table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guest_name text not null,
  room_id uuid references public.rooms(id) on delete set null,
  check_in date not null,
  check_out date not null,
  status text,
  total_cost numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric not null,
  due_date date,
  paid_date date,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Housekeeping table
create table if not exists public.housekeeping (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  type text,
  status text,
  task_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text,
  action text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Update function for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

drop trigger if exists housekeeping_set_updated_at on public.housekeeping;
create trigger housekeeping_set_updated_at
before update on public.housekeeping
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.invoices enable row level security;
alter table public.housekeeping enable row level security;
alter table public.audit_logs enable row level security;

-- RLS Policies for rooms
create policy "rooms_read_own" on public.rooms for select using (auth.uid() = user_id);
create policy "rooms_insert_own" on public.rooms for insert with check (auth.uid() = user_id);
create policy "rooms_update_own" on public.rooms for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rooms_delete_own" on public.rooms for delete using (auth.uid() = user_id);

-- RLS Policies for bookings
create policy "bookings_read_own" on public.bookings for select using (auth.uid() = user_id);
create policy "bookings_insert_own" on public.bookings for insert with check (auth.uid() = user_id);
create policy "bookings_update_own" on public.bookings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bookings_delete_own" on public.bookings for delete using (auth.uid() = user_id);

-- RLS Policies for invoices
create policy "invoices_read_own" on public.invoices for select using (auth.uid() = user_id);
create policy "invoices_insert_own" on public.invoices for insert with check (auth.uid() = user_id);
create policy "invoices_update_own" on public.invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_delete_own" on public.invoices for delete using (auth.uid() = user_id);

-- RLS Policies for housekeeping
create policy "housekeeping_read_own" on public.housekeeping for select using (auth.uid() = user_id);
create policy "housekeeping_insert_own" on public.housekeeping for insert with check (auth.uid() = user_id);
create policy "housekeeping_update_own" on public.housekeeping for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "housekeeping_delete_own" on public.housekeeping for delete using (auth.uid() = user_id);

-- RLS Policies for audit_logs
create policy "audit_logs_read_own" on public.audit_logs for select using (auth.uid() = user_id);
create policy "audit_logs_insert_own" on public.audit_logs for insert with check (auth.uid() = user_id);

-- App state table for lightweight persisted UI/module data (used by useAppState hook)
create table if not exists public.app_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_state enable row level security;

create policy "app_state_read_own"
on public.app_state
for select
using (auth.uid() = user_id);

create policy "app_state_insert_own"
on public.app_state
for insert
with check (auth.uid() = user_id);

create policy "app_state_update_own"
on public.app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "app_state_delete_own"
on public.app_state
for delete
using (auth.uid() = user_id);
