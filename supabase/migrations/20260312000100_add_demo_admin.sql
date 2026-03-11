-- Insert admin@room.com into sa_admin_users as demo admin
INSERT INTO public.sa_admin_users (
  user_id,
  auth_user_id,
  name,
  email,
  property_name,
  status,
  must_reset_password,
  created_at,
  updated_at
)
SELECT
  (SELECT COALESCE(MAX(user_id), 0) + 1 FROM public.sa_admin_users),
  id,
  'Admin Demo',
  'admin@room.com',
  'admin only',
  'Active',
  false,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@room.com'
ON CONFLICT DO NOTHING;
