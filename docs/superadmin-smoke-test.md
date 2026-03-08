# Superadmin Backend Smoke Test

Run this after executing all SQL migrations and signing in as superadmin.

## Prerequisites

- `.env` uses the correct Supabase project.
- SQL scripts already run:
  - `supabase/superadmin.sql`
  - `supabase/superadmin_users_settings.sql`
  - `supabase/superadmin_permissions_matrix.sql`
  - `supabase/superadmin_bootstrap.sql`
- Login works at `/superadmin/login`.

## 1) Dashboard

1. Open `/superadmin`.
2. Confirm cards are not static placeholders.
3. Validate cards match table data trend:
   - Total Properties -> `sa_properties` rows for logged in user.
   - Security Events (24h) -> warning/error notifications in `sa_notifications`.

Expected:
- Values update after creating/deleting properties and notifications.

## 2) Properties

1. Open `/superadmin/properties`.
2. Create one new property.
3. Edit same property status/occupancy.
4. Delete same property.

Expected:
- Create/Update/Delete reflects in UI and `sa_properties` table.
- On delete, item is added in `sa_recycle_bin` with module `properties`.

## 3) Announcements

1. Open `/superadmin/announcements`.
2. Create one announcement.
3. Edit its priority.
4. Delete it.

Expected:
- Data persists in `sa_announcements`.
- Deleted item goes to `sa_recycle_bin` with module `announcements`.

## 4) Approvals

1. Open `/superadmin/approvals`.
2. Approve one pending property and reject one pending announcement.

Expected:
- Status updates in source tables (`sa_properties`, `sa_announcements`).
- Decision rows created in `sa_approvals`.

## 5) Recycle Bin

1. Open `/superadmin/recycle-bin`.
2. Restore one deleted property or announcement.
3. Permanently delete one item.

Expected:
- Restore re-inserts in source table and removes from recycle bin.
- Permanent delete removes item only from `sa_recycle_bin`.

## 6) Notifications

1. Open `/superadmin/notifications`.
2. Mark one unread notification as read.
3. Use "Mark All Read".
4. Delete one item.

Expected:
- Changes persist in `sa_notifications` (`is_read` and delete behavior).

## 7) Users

1. Open `/superadmin/admin-users`.
2. Add admin user.
3. Change status to Active/Suspended.
4. Delete user.

Expected:
- CRUD persists in `sa_admin_users`.

## 8) Platform Settings

1. Open `/superadmin/platform-settings`.
2. Toggle all switches and click Save.
3. Reload page.

Expected:
- Saved values persist from `sa_platform_settings.settings` JSON.

## 9) Permissions

1. Open `/superadmin/permissions`.
2. Toggle one permission on/off.
3. Edit one policy title/description.

Expected:
- Changes persist in `sa_permission_policies`.

## 10) Role Matrix

1. Open `/superadmin/role-matrix`.
2. Toggle any module-role cell.
3. Reload page.

Expected:
- JSON `permissions` persists in `sa_role_matrix_config`.

## 11) Cross-module consistency

1. Create property/announcement.
2. Approve or reject in Approvals.
3. Check Notifications feed.
4. Check Audit logs page.

Expected:
- Notifications appear in `sa_notifications`.
- Audit entries appear in app audit trail.

## Fail Criteria

- UI change appears but DB table does not change.
- DB table changes but reload loses state.
- Restore flow duplicates rows repeatedly.
- Role matrix or permissions reset unexpectedly after reload.

## Production Readiness Snapshot

Status legend: `[x] Done` `[ ] Verify now` `[ ] Optional`

### Backend Integration Status

- [x] Supabase Auth login works for superadmin.
- [x] Superadmin pages are connected to backend tables (`sa_*`).
- [x] CRUD flows implemented for properties, announcements, users.
- [x] Approvals and recycle bin persistence implemented.
- [x] Platform settings, permissions, and role matrix persistence implemented.
- [x] Demo seed SQL available: `supabase/superadmin_demo_seed.sql`.
- [x] Slow button/toggle UX optimized with optimistic updates on key pages.

### Must-Verify Before Signoff

- [ ] Run `supabase/superadmin_smoke_checks.sql` and confirm expected counts.
- [ ] Run full UI smoke (sections 1-11 in this file) on latest build.
- [ ] Confirm no regressions after hard refresh (`Ctrl+Shift+R`).
- [ ] Confirm RLS ownership behavior with logged-in superadmin user only.

### Optional Cleanup

- [ ] Decide whether demo data should remain in production DB.
- [ ] Standardize loading/error messages across all superadmin pages.
- [ ] Add automated integration test coverage for superadmin critical flows.

## Signoff Template

Use this quick template for final closure:

```text
Superadmin Backend Signoff
Date:
Tester:

Smoke checks SQL: PASS / FAIL
UI smoke (1-11): PASS / FAIL
RLS/ownership checks: PASS / FAIL

Known issues:
1)
2)

Decision: GO-LIVE / HOLD
```
