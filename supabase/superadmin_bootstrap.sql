-- Super Admin bootstrap script
-- Run this AFTER `supabase/superadmin.sql` and `supabase/app_state.sql`.

-- 1) Ensure existing auth user has superadmin metadata.
-- If this email user does not exist, first create it from Authentication -> Users.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"superadmin","full_name":"Super Admin"}'::jsonb
where email = 'superadmin@room.com';

-- 2) Seed module data into app_state for that user.
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.app_state (user_id, key, value)
select
  target_user.user_id,
  data.key,
  data.value
from target_user
cross join (
  values
    (
      'sa_properties',
      '[
        {"id":"p1","name":"Delhi Central","city":"Delhi","admins":4,"occupancy":"82%","status":"Healthy","approvalStatus":"Approved"},
        {"id":"p2","name":"Jaipur Palace","city":"Jaipur","admins":3,"occupancy":"76%","status":"Healthy","approvalStatus":"Approved"},
        {"id":"p3","name":"Goa Bay","city":"Goa","admins":2,"occupancy":"69%","status":"Watch","approvalStatus":"Pending"}
      ]'::jsonb
    ),
    (
      'sa_announcements',
      '[
        {"id":"a1","title":"Scheduled maintenance window","audience":"All Properties","date":"08 Mar 2026","priority":"High","approvalStatus":"Approved"},
        {"id":"a2","title":"Night audit policy update","audience":"Admin + Manager","date":"10 Mar 2026","priority":"Medium","approvalStatus":"Pending"}
      ]'::jsonb
    ),
    (
      'sa_permissions',
      '[
        {"id":"billing-write","title":"Allow Admin Billing Edits","description":"Permit property admins to edit invoices and payment status.","enabled":true},
        {"id":"staff-delete","title":"Allow Staff Delete","description":"Allow manager roles to delete staff profiles from roster.","enabled":false},
        {"id":"booking-export","title":"Allow Booking Export","description":"Enable CSV export for all confirmed and cancelled bookings.","enabled":true}
      ]'::jsonb
    ),
    (
      'sa_notifications',
      '[
        {"id":"n1","title":"Bootstrap complete","message":"Superadmin workspace is initialized.","module":"bootstrap","severity":"success","createdAt":"2026-03-07T10:00:00.000Z","read":false}
      ]'::jsonb
    ),
    (
      'sa_role_matrix',
      '[
        {"module":"Rooms","permissions":{"admin":true,"manager":true,"frontdesk":true,"housekeeping":true,"accountant":false}},
        {"module":"Bookings","permissions":{"admin":true,"manager":true,"frontdesk":true,"housekeeping":false,"accountant":false}},
        {"module":"Billing","permissions":{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":true}},
        {"module":"Reports","permissions":{"admin":true,"manager":true,"frontdesk":false,"housekeeping":false,"accountant":true}}
      ]'::jsonb
    )
) as data(key, value)
on conflict (user_id, key)
do update set
  value = excluded.value,
  updated_at = now();

-- 3) Optional direct table seed (for future migration use)
with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_properties (user_id, name, city, admins_count, occupancy, health_status, approval_status)
select user_id, 'Mumbai Skyline', 'Mumbai', 3, '74%', 'Watch', 'Pending'
from target_user
where not exists (
  select 1
  from public.sa_properties p
  where p.user_id = target_user.user_id and p.name = 'Mumbai Skyline'
);

with target_user as (
  select id as user_id
  from auth.users
  where email = 'superadmin@room.com'
  limit 1
)
insert into public.sa_announcements (user_id, title, audience, publish_date, priority, approval_status)
select user_id, 'Compliance policy refresh', 'All Properties', '15 Mar 2026', 'High', 'Pending'
from target_user
where not exists (
  select 1
  from public.sa_announcements a
  where a.user_id = target_user.user_id and a.title = 'Compliance policy refresh'
);
