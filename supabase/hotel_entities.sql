-- Run this in Supabase SQL editor after supabase/app_state.sql.

-- Extend base rooms table with fields used by the frontend pages.
alter table if exists public.rooms add column if not exists floor int;
alter table if exists public.rooms add column if not exists guest_name text;

-- Guests table
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  visits int not null default 0,
  status text not null default 'Upcoming',
  last_visit date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff members table
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  email text not null,
  phone text not null,
  status text not null default 'On Duty',
  shift text not null default 'Morning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Property settings table
create table if not exists public.property_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  property jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  payments jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Reuse app-wide update trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guests_set_updated_at on public.guests;
create trigger guests_set_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
before update on public.staff_members
for each row
execute function public.set_updated_at();

drop trigger if exists property_settings_set_updated_at on public.property_settings;
create trigger property_settings_set_updated_at
before update on public.property_settings
for each row
execute function public.set_updated_at();

alter table public.guests enable row level security;
alter table public.staff_members enable row level security;
alter table public.property_settings enable row level security;

-- RLS policies for guests
drop policy if exists "guests_read_own" on public.guests;
create policy "guests_read_own"
on public.guests
for select
using (auth.uid() = user_id);

drop policy if exists "guests_insert_own" on public.guests;
create policy "guests_insert_own"
on public.guests
for insert
with check (auth.uid() = user_id);

drop policy if exists "guests_update_own" on public.guests;
create policy "guests_update_own"
on public.guests
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "guests_delete_own" on public.guests;
create policy "guests_delete_own"
on public.guests
for delete
using (auth.uid() = user_id);

-- RLS policies for staff_members
drop policy if exists "staff_members_read_own" on public.staff_members;
create policy "staff_members_read_own"
on public.staff_members
for select
using (auth.uid() = user_id);

drop policy if exists "staff_members_insert_own" on public.staff_members;
create policy "staff_members_insert_own"
on public.staff_members
for insert
with check (auth.uid() = user_id);

drop policy if exists "staff_members_update_own" on public.staff_members;
create policy "staff_members_update_own"
on public.staff_members
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "staff_members_delete_own" on public.staff_members;
create policy "staff_members_delete_own"
on public.staff_members
for delete
using (auth.uid() = user_id);

-- RLS policies for property_settings
drop policy if exists "property_settings_read_own" on public.property_settings;
create policy "property_settings_read_own"
on public.property_settings
for select
using (auth.uid() = user_id);

drop policy if exists "property_settings_insert_own" on public.property_settings;
create policy "property_settings_insert_own"
on public.property_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "property_settings_update_own" on public.property_settings;
create policy "property_settings_update_own"
on public.property_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "property_settings_delete_own" on public.property_settings;
create policy "property_settings_delete_own"
on public.property_settings
for delete
using (auth.uid() = user_id);
