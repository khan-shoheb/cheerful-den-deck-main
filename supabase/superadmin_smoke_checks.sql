-- Superadmin smoke verification SQL
-- Run in Supabase SQL editor after manual UI actions.

-- 1) Confirm superadmin user exists
select id, email, raw_user_meta_data
from auth.users
where email = 'superadmin@room.com';

-- 2) Row counts by module tables (current user)
with u as (
  select id as user_id from auth.users where email = 'superadmin@room.com' limit 1
)
select 'sa_properties' as table_name, count(*) as row_count
from public.sa_properties p, u
where p.user_id = u.user_id
union all
select 'sa_announcements', count(*)
from public.sa_announcements a, u
where a.user_id = u.user_id
union all
select 'sa_recycle_bin', count(*)
from public.sa_recycle_bin r, u
where r.user_id = u.user_id
union all
select 'sa_approvals', count(*)
from public.sa_approvals ap, u
where ap.user_id = u.user_id
union all
select 'sa_notifications', count(*)
from public.sa_notifications n, u
where n.user_id = u.user_id
union all
select 'sa_admin_users', count(*)
from public.sa_admin_users au, u
where au.user_id = u.user_id
union all
select 'sa_permission_policies', count(*)
from public.sa_permission_policies pp, u
where pp.user_id = u.user_id
union all
select 'sa_role_matrix_config', count(*)
from public.sa_role_matrix_config rm, u
where rm.user_id = u.user_id
union all
select 'sa_platform_settings', count(*)
from public.sa_platform_settings ps, u
where ps.user_id = u.user_id;

-- 3) Check recent approvals trail
with u as (
  select id as user_id from auth.users where email = 'superadmin@room.com' limit 1
)
select module, item_name, requested_status, decided_status, decided_by, decided_at, created_at
from public.sa_approvals ap, u
where ap.user_id = u.user_id
order by created_at desc
limit 20;

-- 4) Check unread notifications
with u as (
  select id as user_id from auth.users where email = 'superadmin@room.com' limit 1
)
select id, title, module, severity, is_read, created_at
from public.sa_notifications n, u
where n.user_id = u.user_id
order by created_at desc
limit 30;

-- 5) Inspect platform settings JSON
with u as (
  select id as user_id from auth.users where email = 'superadmin@room.com' limit 1
)
select settings, updated_at
from public.sa_platform_settings ps, u
where ps.user_id = u.user_id;
