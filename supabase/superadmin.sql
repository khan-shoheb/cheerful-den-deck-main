-- Run in Supabase SQL editor for dedicated Super Admin module tables.

create table if not exists public.sa_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text not null,
  admins_count int not null default 1,
  occupancy text not null default '0%',
  health_status text not null default 'Watch',
  approval_status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sa_announcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  audience text not null,
  publish_date text not null,
  priority text not null default 'Medium',
  approval_status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sa_recycle_bin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  item_id text not null,
  item_name text not null,
  payload jsonb not null,
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.sa_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  item_id text not null,
  item_name text not null,
  requested_status text not null default 'Pending',
  decided_status text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sa_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  module text not null,
  severity text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.sa_properties enable row level security;
alter table public.sa_announcements enable row level security;
alter table public.sa_recycle_bin enable row level security;
alter table public.sa_approvals enable row level security;
alter table public.sa_notifications enable row level security;

drop policy if exists "sa_properties_read_own" on public.sa_properties;
create policy "sa_properties_read_own"
on public.sa_properties
for select
using (auth.uid() = user_id);

drop policy if exists "sa_properties_insert_own" on public.sa_properties;
create policy "sa_properties_insert_own"
on public.sa_properties
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_properties_update_own" on public.sa_properties;
create policy "sa_properties_update_own"
on public.sa_properties
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_properties_delete_own" on public.sa_properties;
create policy "sa_properties_delete_own"
on public.sa_properties
for delete
using (auth.uid() = user_id);

drop policy if exists "sa_announcements_read_own" on public.sa_announcements;
create policy "sa_announcements_read_own"
on public.sa_announcements
for select
using (auth.uid() = user_id);

drop policy if exists "sa_announcements_insert_own" on public.sa_announcements;
create policy "sa_announcements_insert_own"
on public.sa_announcements
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_announcements_update_own" on public.sa_announcements;
create policy "sa_announcements_update_own"
on public.sa_announcements
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_announcements_delete_own" on public.sa_announcements;
create policy "sa_announcements_delete_own"
on public.sa_announcements
for delete
using (auth.uid() = user_id);

drop policy if exists "sa_recycle_bin_read_own" on public.sa_recycle_bin;
create policy "sa_recycle_bin_read_own"
on public.sa_recycle_bin
for select
using (auth.uid() = user_id);

drop policy if exists "sa_recycle_bin_insert_own" on public.sa_recycle_bin;
create policy "sa_recycle_bin_insert_own"
on public.sa_recycle_bin
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_recycle_bin_update_own" on public.sa_recycle_bin;
create policy "sa_recycle_bin_update_own"
on public.sa_recycle_bin
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_recycle_bin_delete_own" on public.sa_recycle_bin;
create policy "sa_recycle_bin_delete_own"
on public.sa_recycle_bin
for delete
using (auth.uid() = user_id);

drop policy if exists "sa_approvals_read_own" on public.sa_approvals;
create policy "sa_approvals_read_own"
on public.sa_approvals
for select
using (auth.uid() = user_id);

drop policy if exists "sa_approvals_insert_own" on public.sa_approvals;
create policy "sa_approvals_insert_own"
on public.sa_approvals
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_approvals_update_own" on public.sa_approvals;
create policy "sa_approvals_update_own"
on public.sa_approvals
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_approvals_delete_own" on public.sa_approvals;
create policy "sa_approvals_delete_own"
on public.sa_approvals
for delete
using (auth.uid() = user_id);

drop policy if exists "sa_notifications_read_own" on public.sa_notifications;
create policy "sa_notifications_read_own"
on public.sa_notifications
for select
using (auth.uid() = user_id);

drop policy if exists "sa_notifications_insert_own" on public.sa_notifications;
create policy "sa_notifications_insert_own"
on public.sa_notifications
for insert
with check (auth.uid() = user_id);

drop policy if exists "sa_notifications_update_own" on public.sa_notifications;
create policy "sa_notifications_update_own"
on public.sa_notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sa_notifications_delete_own" on public.sa_notifications;
create policy "sa_notifications_delete_own"
on public.sa_notifications
for delete
using (auth.uid() = user_id);
