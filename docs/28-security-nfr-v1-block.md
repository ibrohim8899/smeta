# 28. Security and NFR V1 Block

Date: 2026-08-13

Scope: TZ V1 security hardening, rate limiting, production secret checks and integration health visibility.

## Completed

- Added global security headers:
  - `x-request-id`,
  - `x-content-type-options: nosniff`,
  - `x-frame-options: DENY`,
  - `referrer-policy: same-origin`,
  - `permissions-policy`.
- Added in-memory request rate limiting:
  - configurable `RATE_LIMIT_WINDOW_SECONDS`,
  - configurable `RATE_LIMIT_MAX_REQUESTS`,
  - `x-ratelimit-*` response headers,
  - Uzbek user-facing `429` response.
- `/health` remains public and lightweight.
- Added protected integration health endpoint: `GET /health/integrations`.
- Integration health reports:
  - database status,
  - upload directory mode/status,
  - object storage configuration status,
  - Telegram bot configuration status,
  - notification pending/failed/dead-letter counts.
- Production startup now fails fast if critical secrets are missing:
  - `DATABASE_URL`,
  - `JWT_ACCESS_SECRET`,
  - `TELEGRAM_BOT_TOKEN`.
- `.env` and `.env.example` now include rate-limit configuration.

## Runtime Checks

- `GET /health`: returned `200` and security headers.
- `GET /reports/v1-summary`: returned `200` with `x-ratelimit-*` headers.
- `GET /health/integrations` with `superadmin`: returned integration status.
- `GET /health/integrations` with `customer`: returned `403`.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- API dev server: `http://localhost:4000`.
- Web dev server: `http://localhost:5173`.

## Remaining Security/NFR Gaps

- In-memory rate limiting is V1-safe for a single API process; production multi-instance deployments should use Redis or gateway-level rate limiting.
- Real ownership binding still depends on Telegram user-to-store/dealer/customer mapping in the remaining auth/Tel block.
- OpenAPI docs are still missing.
- Structured migrations and automated test suites are still missing.
- Observability is basic; logs/traces/metrics need a production pass.
