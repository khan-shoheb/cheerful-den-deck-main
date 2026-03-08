-- Superadmin demo seed for backend mode
-- Run after:
-- 1) supabase/superadmin.sql
-- 2) supabase/superadmin_users_settings.sql
-- 3) supabase/superadmin_permissions_matrix.sql

with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || '{"role":"superadmin","full_name":"Super Admin"}'::jsonb
where id = (select user_id from target_user);

-- Properties
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_properties (user_id, name, city, admins_count, occupancy, health_status, approval_status)
select tu.user_id, x.name, x.city, x.admins_count, x.occupancy, x.health_status, x.approval_status
from target_user tu
cross join (
  values
    ('Delhi Central', 'Delhi', 4, '82%', 'Healthy', 'Approved'),
    ('Jaipur Palace', 'Jaipur', 3, '76%', 'Healthy', 'Approved'),
    ('Goa Bay', 'Goa', 2, '69%', 'Watch', 'Pending'),
    ('Blue Star', 'Pune', 2, '61%', 'Needs Review', 'Pending')
) as x(name, city, admins_count, occupancy, health_status, approval_status)
where not exists (
  select 1 from public.sa_properties p
  where p.user_id = tu.user_id and lower(p.name) = lower(x.name)
);

-- Announcements
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_announcements (user_id, title, audience, publish_date, priority, approval_status)
select tu.user_id, x.title, x.audience, x.publish_date, x.priority, x.approval_status
from target_user tu
cross join (
  values
    ('Scheduled maintenance window', 'All Properties', '08 Mar 2026', 'High', 'Approved'),
    ('Night audit policy update', 'Admin + Manager', '10 Mar 2026', 'Medium', 'Pending'),
    ('Housekeeping app update v2.4', 'Housekeeping', '12 Mar 2026', 'Low', 'Approved')
) as x(title, audience, publish_date, priority, approval_status)
where not exists (
  select 1 from public.sa_announcements a
  where a.user_id = tu.user_id and lower(a.title) = lower(x.title)
);

-- Notifications
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_notifications (user_id, title, message, module, severity, is_read, created_at)
select tu.user_id, x.title, x.message, x.module, x.severity, x.is_read, x.created_at::timestamptz
from target_user tu
cross join (
  values
    ('Security policy updated', 'MFA enforcement policy was updated for all admins.', 'superadmin-settings', 'warning', false, now() - interval '2 hour'),
    ('Property approved', 'Delhi Central has been approved and is live.', 'superadmin-approvals', 'success', true, now() - interval '6 hour'),
    ('New admin request', 'A new admin user request is pending approval.', 'superadmin-users', 'info', false, now() - interval '30 minute')
) as x(title, message, module, severity, is_read, created_at)
where not exists (
  select 1 from public.sa_notifications n
  where n.user_id = tu.user_id
    and n.title = x.title
    and n.module = x.module
    and n.message = x.message
);

-- Admin users
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_admin_users (user_id, name, email, property_name, status)
select tu.user_id, x.name, x.email, x.property_name, x.status
from target_user tu
cross join (
  values
    ('Ravi Sharma', 'ravi@hotelcentral.com', 'Delhi Central', 'Active'),
    ('Meera Kapoor', 'meera@jaipurpalace.com', 'Jaipur Palace', 'Active'),
    ('Arjun Nair', 'arjun@goabay.com', 'Goa Bay', 'Pending')
) as x(name, email, property_name, status)
where not exists (
  select 1 from public.sa_admin_users u
  where u.user_id = tu.user_id and lower(u.email) = lower(x.email)
);

-- Permission policies
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_permission_policies (user_id, title, description, enabled)
select tu.user_id, x.title, x.description, x.enabled
from target_user tu
cross join (
  values
    ('Allow Admin Billing Edits', 'Permit property admins to edit invoices and payment status.', true),
    ('Allow Staff Delete', 'Allow manager roles to delete staff profiles from roster.', false),
    ('Allow Booking Export', 'Enable CSV export for all confirmed and cancelled bookings.', true),
    ('Enforce Night Audit Lock', 'Freeze booking modifications after midnight until audit completion.', true)
) as x(title, description, enabled)
where not exists (
  select 1 from public.sa_permission_policies p
  where p.user_id = tu.user_id and p.title = x.title
);

-- Role matrix config
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_role_matrix_config (user_id, module, permissions)
select tu.user_id, x.module, x.permissions
from target_user tu
cross join (
  values
    ('Rooms', '{"admin":true,"manager":true,"frontdesk":true,"housekeeping":true,"accountant":false}'::jsonb),
    ('Bookings', '{"admin":true,"manager":true,"frontdesk":true,"housekeeping":false,"accountant":false}'::jsonb),
    ('Billing', '{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":true}'::jsonb),
    ('Reports', '{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":true}'::jsonb),
    ('Staff', '{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":false}'::jsonb)
) as x(module, permissions)
on conflict (user_id, module)
do update set
  permissions = excluded.permissions,
  updated_at = now();

-- Platform settings
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_platform_settings (user_id, settings)
select
  tu.user_id,
  '{"enforceMfa":true,"ipRestriction":false,"criticalAlertEmail":true}'::jsonb
from target_user tu
on conflict (user_id)
do update set
  settings = excluded.settings,
  updated_at = now();

-- App-state mirror for fallback-driven cards/components
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.app_state (user_id, key, value)
select
  tu.user_id,
  seed.key,
  seed.value
from target_user tu
cross join (
  values
    (
      'sa_permissions',
      '[
        {"id":"billing-write","title":"Allow Admin Billing Edits","description":"Permit property admins to edit invoices and payment status.","enabled":true},
        {"id":"staff-delete","title":"Allow Staff Delete","description":"Allow manager roles to delete staff profiles from roster.","enabled":false},
        {"id":"booking-export","title":"Allow Booking Export","description":"Enable CSV export for all confirmed and cancelled bookings.","enabled":true},
        {"id":"night-audit-lock","title":"Enforce Night Audit Lock","description":"Freeze booking modifications after midnight until audit completion.","enabled":true}
      ]'::jsonb
    ),
    (
      'sa_role_matrix',
      '[
        {"module":"Rooms","permissions":{"admin":true,"manager":true,"frontdesk":true,"housekeeping":true,"accountant":false}},
        {"module":"Bookings","permissions":{"admin":true,"manager":true,"frontdesk":true,"housekeeping":false,"accountant":false}},
        {"module":"Billing","permissions":{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":true}},
        {"module":"Reports","permissions":{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":true}},
        {"module":"Staff","permissions":{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":false}}
      ]'::jsonb
    )
) as seed(key, value)
on conflict (user_id, key)
do update set
  value = excluded.value,
  updated_at = now();

-- Verification snapshot
with u as (
  select id as user_id from auth.users where email = 'superadmin@room.com' limit 1
)
select 'sa_properties' as table_name, count(*) as row_count from public.sa_properties p, u where p.user_id = u.user_id
union all
select 'sa_announcements', count(*) from public.sa_announcements a, u where a.user_id = u.user_id
union all
select 'sa_notifications', count(*) from public.sa_notifications n, u where n.user_id = u.user_id
union all
select 'sa_admin_users', count(*) from public.sa_admin_users au, u where au.user_id = u.user_id
union all
select 'sa_permission_policies', count(*) from public.sa_permission_policies pp, u where pp.user_id = u.user_id
union all
select 'sa_role_matrix_config', count(*) from public.sa_role_matrix_config rm, u where rm.user_id = u.user_id
union all
select 'sa_platform_settings', count(*) from public.sa_platform_settings ps, u where ps.user_id = u.user_id;
