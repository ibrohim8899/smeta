# 30 - TZ V1 full reanalysis and completion pass

Date: 2026-08-13

Source: `C:\Users\user\Downloads\Telegram Desktop\SMETA_MARKET_V1_Technical_Specification_TZ.docx`

## Reanalysis Result

The TZ V1 matrix still has 269 requirements. After the latest pass, the codebase now covers the main executable V1 flows:

- Guest/dealer referral request creation and secure customer link.
- Store matching, inbox privacy, offer submission, selection and order lifecycle.
- Customer secure page for contact, offer comparison, selection, cancel, dispute and delivery confirmation.
- Finance ledger, partial/full payments, payment history, due dates, aging buckets, adjustments/waivers, store statements, dealer statements and dealer payouts.
- Admin reports, CSV export, dispute queue and dispute resolution.
- Telegram Mini App initData exchange, browser login nonce, Telegram webhook idempotency and session revocation APIs.
- Persistent V1 settings for regions, categories, commission defaults and timeout values.
- Notification outbox retry/dead-letter workflow.
- File upload validation, private streaming and unsafe scan status download blocking.

## Latest Completion Estimate

Functional V1 application readiness is now approximately 75-80%.

| Area | Status after this pass |
| --- | --- |
| AUTH | Mostly implemented in code. Browser nonce, webhook idempotency, session lifecycle and revoke APIs exist. Full production depends on real Telegram bot configuration and role ownership onboarding. |
| CUS | Core V1 done. Secure guest page supports the main customer lifecycle. Remaining polish: richer mobile upload progress/thumbnails and Telegram request history. |
| DLR | Referral/dashboard mostly done. Dealer payout history is now implemented through finance payout APIs. Remaining: payout profile fields and support-note polish. |
| STR | Store application/profile/inbox/offer/order status mostly done. Remaining: legal docs/logo and richer store-facing debt statement UI. |
| CORE | Main request-to-finance path works. Idempotent offer selection and notification idempotency exist. Remaining: formal deadline jobs for expired/no-offer/acceptance timeout. |
| FIN | Major V1 finance gap closed: aging, adjustments, statements and dealer payouts are implemented. |
| ADM | Reports, settings and dispute resolution are implemented. Remaining: full user/role management screen and advanced operational assignment UI. |
| TEL | Backend webhook/deep-link/browser-login code exists. Real bot menus and Telegram sender require bot token and production webhook setup. |
| NOT | Outbox and retry are implemented. Real Telegram send worker remains configuration/integration work. |
| FILE | V1 local/private file flow works. Production S3/object storage, previews and antivirus integration remain infrastructure work. |
| RPT | Summary/CSV exists. Finance/dispute data improved. Remaining: repeat-customer and fiscal receipt coverage metrics. |
| NFR | Typecheck/build/rate limit/security headers/health exist. Remaining: TypeORM migrations, automated test suite, OpenAPI and runbook. |

## Implemented In This Pass

- Finance:
  - `finance_adjustments`
  - `finance_payouts`
  - due date and aging buckets
  - store/dealer statements
  - payout create/paid/cancel lifecycle
  - payment proof/reference/method fields
  - disputed ledger freeze guard

- Auth/Telegram:
  - browser login nonce table
  - browser login create/poll/cancel/confirm endpoints
  - Telegram webhook endpoint with secret validation and idempotent `update_id`
  - `/start login_<nonce>` and `/login <nonce>` processing
  - user session revoke-all endpoint
  - frontend session-token storage and Telegram login panel

- Admin/settings/disputes:
  - persistent V1 settings table
  - admin settings update with audit
  - request dispute resolve endpoint
  - order dispute resolve endpoint with optional completion and finance snapshot
  - Reports dispute queue resolve actions

## Verification

- `npm run typecheck` passed.
- `npm run build` passed.
- Runtime smoke passed for:
  - finance adjustment/payment/store statement/aging
  - dealer referral order -> ledger -> full store payment -> dealer statement -> payout -> paid payout
  - browser login nonce -> confirm -> poll authenticated session
  - Telegram webhook `/start login_<nonce>` -> idempotent update processing -> authenticated session
  - settings read/update
  - request dispute resolve
  - order dispute resolve -> completed order -> finance ledger snapshot

## Remaining Non-Code / Infra Dependencies

These are not ordinary code bugs in the current workspace, but production dependencies:

- Real `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` and webhook deployment.
- Telegram sender worker implementation against the actual Bot API.
- Production private object storage and antivirus scanner.
- Reviewed TypeORM migrations for all schema changes.
- OpenAPI generation and automated integration tests for CI.
- Backup/restore and operator runbook.
