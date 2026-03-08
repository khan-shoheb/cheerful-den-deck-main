# Release Notes - 2026-03-09

## Scope

This release completes major backend integration and performance optimization for both superadmin and admin workflows.

## Highlights

- Supabase-first authentication and persistence stabilized for superadmin.
- Superadmin modules fully connected to backend `sa_*` tables.
- Admin-side core modules moved to faster interaction patterns.
- UI action latency reduced via optimistic updates across critical pages.
- Notification spam reduced with duplicate suppression.
- Smoke validation and basic automated tests added.

## Superadmin Backend Completion

Implemented and verified backend persistence for:

- `Overview` dashboard metrics
- `Properties`
- `Announcements`
- `Approvals`
- `Recycle Bin`
- `Notifications`
- `Admin Users`
- `Permissions`
- `Role Matrix`
- `Platform Settings`

Supporting SQL and docs:

- `supabase/superadmin.sql`
- `supabase/superadmin_users_settings.sql`
- `supabase/superadmin_permissions_matrix.sql`
- `supabase/superadmin_bootstrap.sql`
- `supabase/superadmin_demo_seed.sql`
- `supabase/superadmin_smoke_checks.sql`
- `docs/superadmin-smoke-test.md`

## Performance and UX Improvements

### Superadmin pages

Optimistic updates and action loading states were added to:

- `src/pages/SuperAdminAnnouncements.tsx`
- `src/pages/SuperAdminProperties.tsx`
- `src/pages/SuperAdminUsers.tsx`
- `src/pages/SuperAdminRecycleBin.tsx`
- `src/pages/SuperAdminRoleMatrix.tsx`
- `src/pages/SuperAdminPermissions.tsx`

### Notification system

- Reduced redundant backend churn by removing refetch loops.
- Added duplicate suppression window for repeated identical notifications.
- Implemented in:
  - `src/hooks/use-superadmin-notifications.ts`

### Admin pages

Optimistic interaction improvements added to:

- `src/pages/Rooms.tsx` (create flow responsiveness)
- `src/pages/Guests.tsx`
- `src/pages/Housekeeping.tsx`

## Validation Performed

- Production build check: `npm run build` (pass)
- Test suite check: `npm run test` (pass)
- Targeted test check:
  - `npx vitest run src/test/use-superadmin-notifications.test.tsx` (pass)
- Supabase SQL smoke checks run and verified with expected table activity.

## New Automated Tests

- `src/test/use-superadmin-notifications.test.tsx`
  - verifies notification add behavior
  - verifies duplicate suppression behavior

## Operational Notes

- Existing duplicate notifications were cleaned via SQL dedupe query.
- Current superadmin notification volume is normalized after cleanup.

## Known Non-Blocking Notes

- Vite build warns about large bundle chunks; no runtime blocker, but future code-splitting can improve bundle size.

## Recommended Next Steps

1. Add integration tests for role-matrix and permissions toggle persistence.
2. Add lightweight e2e smoke scripts for create/edit/delete critical paths.
3. Plan bundle splitting for large admin pages to reduce initial payload.
