-- Superadmin users and platform settings tables
-- Run after supabase/superadmin.sql

create table if not exists public.sa_admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  property_name text not null,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sa_platform_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sa_admin_users enable row level security;
alter table public.sa_platform_settings enable row level security;

drop policy if exists "sa_admin_users_read_own" on public.sa_admin_users;
create policy "sa_admin_users_read_own"
on public.sa_admin_users
for select
using (auth.uid() = user_id);

drop policy if exists "sa_admin_users_insert_own" on public.sa_admin_users;
create policy "sa_admin_users_insert_own"
on public.sa_admin_users
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_admin_users_update_own" on public.sa_admin_users;
create policy "sa_admin_users_update_own"
on public.sa_admin_users
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_admin_users_delete_own" on public.sa_admin_users;
create policy "sa_admin_users_delete_own"
on public.sa_admin_users
for delete
using (auth.uid() = user_id);

drop policy if exists "sa_platform_settings_read_own" on public.sa_platform_settings;
create policy "sa_platform_settings_read_own"
on public.sa_platform_settings
for select
using (auth.uid() = user_id);

drop policy if exists "sa_platform_settings_insert_own" on public.sa_platform_settings;
create policy "sa_platform_settings_insert_own"
on public.sa_platform_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_platform_settings_update_own" on public.sa_platform_settings;
create policy "sa_platform_settings_update_own"
on public.sa_platform_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_platform_settings_delete_own" on public.sa_platform_settings;
create policy "sa_platform_settings_delete_own"
on public.sa_platform_settings
for delete
using (auth.uid() = user_id);
