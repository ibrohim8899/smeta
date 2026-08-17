# 31 - Production cleanup and worker readiness

Date: 2026-08-14

## Completed

- Removed automatic dealer/store demo seeding from application bootstrap.
- Removed password-based default superadmin bootstrap. Superadmin bootstrap now requires `SUPERADMIN_TELEGRAM_USER_ID`.
- Disabled local role preview by default. It is available only when `ALLOW_LOCAL_ROLE_PREVIEW=true` in development.
- Removed the frontend default `superadmin` role header. The frontend now uses a real stored session unless a local preview role is explicitly configured.
- Added a user-facing login screen with Telegram browser-login link creation, polling and cancellation.
- Added header account controls with current user, current role, role switcher and logout.
- Added backend `POST /auth/switch-role` to issue a new audited session for another approved role.
- Added role-based navigation visibility in the frontend while keeping backend guards as the security boundary.
- Added protected internal worker endpoints:
  - `POST /internal/notifications/process`
  - `POST /internal/deadlines/process`
  - `POST /internal/files/cleanup`
- Added Telegram outbox delivery through the Bot API for `telegram` channel notifications.
- Added deadline processing for request offer windows and selected-store acceptance timeouts.
- Added cleanup for unreferenced local upload files older than `TEMP_UPLOAD_RETENTION_HOURS`.
- Added `GET /openapi.json` as the first V1 API contract endpoint.
- Added TypeORM migration wiring and an initial V1 schema migration.
- Added a safe SQL cleanup script for the old automatic seed rows.

## Operational note

New data should now be added through the application flow: Telegram user bootstrap or explicit local preview, dealer/store applications, admin approval, request upload, store offer, customer selection and finance settlement. The app no longer creates demo dealers, stores or a password superadmin automatically.
