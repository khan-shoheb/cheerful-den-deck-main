-- Admin auth provisioning enhancements for superadmin panel
-- Run after supabase/superadmin_users_settings.sql

alter table public.sa_admin_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.sa_admin_users
  add column if not exists must_reset_password boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sa_admin_users_status_check'
      and conrelid = 'public.sa_admin_users'::regclass
  ) then
    alter table public.sa_admin_users
      add constraint sa_admin_users_status_check
      check (status in ('Active', 'Pending', 'Suspended'));
  end if;
end
$$;

create unique index if not exists sa_admin_users_auth_user_id_uq
  on public.sa_admin_users(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists sa_admin_users_user_email_uq
  on public.sa_admin_users(user_id, email);
