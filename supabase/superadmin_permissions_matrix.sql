-- Superadmin governance tables for permissions and role matrix
-- Run after supabase/superadmin.sql

create table if not exists public.sa_permission_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sa_role_matrix_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module)
);

alter table public.sa_permission_policies enable row level security;
alter table public.sa_role_matrix_config enable row level security;

drop policy if exists "sa_permission_policies_read_own" on public.sa_permission_policies;
create policy "sa_permission_policies_read_own"
on public.sa_permission_policies
for select
using (auth.uid() = user_id);

drop policy if exists "sa_permission_policies_insert_own" on public.sa_permission_policies;
create policy "sa_permission_policies_insert_own"
on public.sa_permission_policies
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_permission_policies_update_own" on public.sa_permission_policies;
create policy "sa_permission_policies_update_own"
on public.sa_permission_policies
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_permission_policies_delete_own" on public.sa_permission_policies;
create policy "sa_permission_policies_delete_own"
on public.sa_permission_policies
for delete
using (auth.uid() = user_id);

drop policy if exists "sa_role_matrix_config_read_own" on public.sa_role_matrix_config;
create policy "sa_role_matrix_config_read_own"
on public.sa_role_matrix_config
for select
using (auth.uid() = user_id);

drop policy if exists "sa_role_matrix_config_insert_own" on public.sa_role_matrix_config;
create policy "sa_role_matrix_config_insert_own"
on public.sa_role_matrix_config
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_role_matrix_config_update_own" on public.sa_role_matrix_config;
create policy "sa_role_matrix_config_update_own"
on public.sa_role_matrix_config
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_role_matrix_config_delete_own" on public.sa_role_matrix_config;
create policy "sa_role_matrix_config_delete_own"
on public.sa_role_matrix_config
for delete
using (auth.uid() = user_id);

-- Optional initial seed from existing app_state values
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
),
raw_policies as (
  select (value)::jsonb as value
  from public.app_state
  where key = 'sa_permissions' and user_id = (select user_id from target_user)
),
items as (
  select jsonb_array_elements(value) as item from raw_policies
)
insert into public.sa_permission_policies (user_id, title, description, enabled)
select
  (select user_id from target_user),
  coalesce(item->>'title', 'Untitled Policy'),
  coalesce(item->>'description', ''),
  coalesce((item->>'enabled')::boolean, false)
from items
where (select user_id from target_user) is not null
on conflict do nothing;

with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
),
raw_matrix as (
  select (value)::jsonb as value
  from public.app_state
  where key = 'sa_role_matrix' and user_id = (select user_id from target_user)
),
items as (
  select jsonb_array_elements(value) as item from raw_matrix
)
insert into public.sa_role_matrix_config (user_id, module, permissions)
select
  (select user_id from target_user),
  coalesce(item->>'module', 'Unknown'),
  coalesce(item->'permissions', '{}'::jsonb)
from items
where (select user_id from target_user) is not null
on conflict (user_id, module)
do update set
  permissions = excluded.permissions,
  updated_at = now();
