# 26. Notifications, Files, NFR V1 Block

Date: 2026-08-13

Scope: TZ V1 notification outbox, worker readiness, file access hardening, and basic non-functional safeguards.

## Completed

- Notification outbox now supports scheduled delivery time.
- Added due notification endpoint: `GET /notifications/due`.
- Added worker claim endpoint: `POST /notifications/claim-next`.
- Claim can be scoped by channel to avoid touching unrelated pending jobs.
- Added notification retry endpoint: `POST /notifications/:id/retry`.
- Notification status model now supports:
  - `pending`,
  - `processing`,
  - `sent`,
  - `failed`,
  - `skipped`,
  - `dead_letter`.
- Failed notifications now increment attempts and get exponential retry scheduling.
- Notifications move to `dead_letter` after max attempts.
- Already-sent notifications cannot be reopened.
- Notifications UI now shows processing/dead-letter states, next scheduled retry, and retry action.
- File upload directory is now resolved to an absolute path.
- Uploaded storage filenames include a sanitized original-name hint after UUID.
- Original filenames are sanitized more strongly; leading dots are removed.
- Download guard blocks unsafe scan statuses:
  - `infected`,
  - `blocked`,
  - `failed`.
- Existing attachment download path guard remains based on resolved base path plus `basename`.

## Runtime Checks

- API health check returned ok.
- Telegram-channel QA notification flow passed:
  - created as `pending`,
  - appeared in due list,
  - claimed as `processing`,
  - failed with retry schedule,
  - retried back to `pending`,
  - marked `sent`,
  - reopening a sent notification returned `400`.
- Bad upload using `bad.exe` filename returned `400`.
- File policy helper check:
  - upload directory is absolute,
  - PDF is allowed,
  - `.exe` is blocked,
  - failed scan download is blocked,
  - pending scan download is allowed,
  - unsafe filename sanitized to `_bad_script_.pdf`.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- API dev server: `http://localhost:4000`.
- Web dev server: `http://localhost:5173`.

## Remaining NFR/Notification/File Gaps

- Real Telegram sending worker is still not implemented; outbox is now worker-ready.
- Antivirus scanning is represented by scan status, but no external scanner integration is wired.
- Production storage ACL should be enforced at object-storage level in addition to API checks.
- Rate limiting and request throttling still need a dedicated NFR/security pass.
- Structured migrations are still needed before production if `synchronize` is disabled.
