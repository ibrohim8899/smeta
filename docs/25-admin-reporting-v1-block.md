# 25. Admin Reporting V1 Block

Date: 2026-08-13

Scope: TZ V1 admin moderation, audit filtering, dispute visibility, and basic reporting/export.

## Completed

- Added `reports.read` permission.
- Admin and finance roles can read V1 reports.
- Material request moderation now enforces valid status transitions.
- Admin note is required for sensitive moderation outcomes:
  - `correction_required`,
  - `canceled`,
  - `disputed`.
- Audit endpoint now supports filters:
  - `limit`,
  - `action`,
  - `actorRole`,
  - `entityType`.
- Added Reports API:
  - `GET /reports/v1-summary`,
  - `GET /reports/v1-summary.csv`.
- V1 report includes:
  - request/order/offer/store/dealer/ledger counts,
  - status breakdowns,
  - finance totals,
  - dispute queue.
- Added web Reports page with:
  - V1 metrics,
  - request/order status breakdowns,
  - dispute queue table,
  - authenticated CSV download.
- Security/audit labels were updated for new report, store, order, and finance actions.

## Runtime Checks

- `GET /reports/v1-summary`: returned counts, status breakdowns, finance totals, and dispute queue.
- `GET /reports/v1-summary.csv`: returned CSV rows through `curl.exe`.
- `GET /audit?limit=5&entityType=finance_payment`: returned filtered payment audit rows.
- Invalid request status jump to `completed` returned `400`.
- `disputed` without note returned `400`.
- QA request `REQ-00014` was moved to `disputed` with an admin note and appeared in report dispute queue.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- API dev server: `http://localhost:4000`.
- Web dev server: `http://localhost:5173`.

## Remaining Admin-Scope Gaps

- Dispute resolution workflow is visible and guarded, but detailed resolution actions are still basic.
- CSV export covers summary metrics; row-level exports can be added if V1 requires per-request or per-ledger export files.
- Production audit actor identity depends on real Telegram/session account binding.
- Admin dashboards are still local-preview role based until production auth is connected end-to-end.
