# Deployment Checklist - 2026-03-09

## 1) Pre-Deploy Gate

- [ ] `npm run build` passes locally.
- [ ] `npm run test` passes locally.
- [ ] Superadmin smoke SQL checks already verified.
- [ ] Release notes reviewed:
  - `docs/release-notes-2026-03-09.md`
  - `docs/release-notes-client-2026-03-09.md`

## 2) Environment Variables

Set production env values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_FUNCTIONS_URL` (optional; defaults to `${VITE_SUPABASE_URL}/functions/v1`)

Checks:

- [ ] URL points to the intended production Supabase project.
- [ ] Anon key belongs to same project.
- [ ] No dev/test credentials in production env.

## 3) Database Migration Order (Supabase SQL Editor)

Run in this order:

1. `supabase/app_state.sql`
2. `supabase/hotel_entities.sql`
3. `supabase/billing_enhancements.sql`
4. `supabase/superadmin.sql`
5. `supabase/superadmin_users_settings.sql`
6. `supabase/superadmin_permissions_matrix.sql`

Optional (if demo/staging data needed):

7. `supabase/superadmin_bootstrap.sql`
8. `supabase/superadmin_demo_seed.sql`

Post-migration checks:

- [ ] No SQL errors.
- [ ] Required tables exist and RLS policies applied.
- [ ] Superadmin auth user exists and role metadata is set.

## 4) Auth Readiness

- [ ] `superadmin@room.com` exists in Supabase Auth Users.
- [ ] Email is confirmed.
- [ ] Password is set and tested.
- [ ] `raw_user_meta_data.role = "superadmin"`.

Verification query:

```sql
select id, email, email_confirmed_at, raw_user_meta_data
from auth.users
where email = 'superadmin@room.com';
```

## 5) Build and Publish

- [ ] Build production assets:

```bash
npm run build
```

- [ ] Publish `dist/` to hosting target.
- [ ] Ensure SPA fallback to `index.html` is enabled.
- [ ] Ensure HTTPS is enabled.

## 6) Post-Deploy Smoke URLs

Admin:

- [ ] `/login`
- [ ] `/dashboard`
- [ ] `/rooms`
- [ ] `/guests`
- [ ] `/housekeeping`

Superadmin:

- [ ] `/superadmin/login`
- [ ] `/superadmin`
- [ ] `/superadmin/properties`
- [ ] `/superadmin/announcements`
- [ ] `/superadmin/approvals`
- [ ] `/superadmin/recycle-bin`
- [ ] `/superadmin/notifications`
- [ ] `/superadmin/admin-users`
- [ ] `/superadmin/permissions`
- [ ] `/superadmin/role-matrix`
- [ ] `/superadmin/platform-settings`

Expected:

- [ ] Login works.
- [ ] Create/Edit/Delete actions persist.
- [ ] Role matrix/permissions toggles persist after reload.
- [ ] Notifications and approvals trail update correctly.

## 7) Cache/PWA Safety

- [ ] Hard refresh once after deploy (`Ctrl+Shift+R`).
- [ ] If stale behavior appears, unregister service worker once and reload.

## 8) Rollback Plan

If critical issue occurs:

1. Revert frontend deployment to previous stable artifact.
2. Keep DB schema as-is unless a migration is known-bad and reversible.
3. Disable newly exposed paths temporarily (if host/router supports it).
4. Re-run smoke checks on rolled-back version.

## 9) Final Signoff

- [ ] Technical signoff (build/test/smoke).
- [ ] Product signoff (critical flows accepted).
- [ ] Client update shared.
