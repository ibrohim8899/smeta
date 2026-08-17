# 27. TZ Reanalysis After 8 Blocks

Date: 2026-08-13

Source: `C:\Users\user\Downloads\Telegram Desktop\SMETA_MARKET_V1_Technical_Specification_TZ.docx`

The TZ was re-extracted on 2026-08-13. It contains 269 numbered V1 requirements:

| Group | Count | Current status |
| --- | ---: | --- |
| AUTH | 18 | Mostly partial. Telegram Mini App exchange exists, but browser bot-login nonce and production ownership binding are missing. |
| CUS | 28 | Core guest request, referral, offer selection and delivery confirmation exist. Draft preservation, Telegram history/linking, cancellation/problem flow need work. |
| DLR | 20 | Referral capture, dashboard, request list and summary exist. Payout details/history, support notes and suspicious referral review need work. |
| STR | 30 | Store application/profile/inbox/offers/decline/withdraw privacy mostly exists. Store Telegram identity binding, legal docs/logo, accepted-order contact release and debt statement need work. |
| CORE | 30 | Main request -> assign -> offer -> select -> order -> finance path works. Timeout/no-offer/duplicate/idempotency and richer status history still need work. |
| FIN | 36 | Ledger, commission, dealer reward, payment history and overpay protection exist. Payouts, adjustments/reversals, aging, statements and exports need work. |
| ADM | 40 | Queue, moderation guard, store/dealer management, audit filters and summary reports exist. User/role management, settings dictionaries, dispute resolution and overrides need work. |
| TEL | 5 | Mostly missing. Outbox is worker-ready, but official bot, webhook, menus and signed deep links are not implemented. |
| NOT | 4 | Mostly done for outbox/retry/history. Preferences/templates and true Telegram sender still missing. |
| FILE | 8 | Supported types, limits, private streaming and sanitization exist. Real object storage, checksum, preview and scanner integration are incomplete. |
| RPT | 5 | Basic operational/commercial summary and CSV exist. Repeat customer and receipt coverage metrics are incomplete. |
| NFR | 30 | Build/typecheck/guards exist. Rate limiting, OpenAPI, migrations, automated tests, observability, backups and runbook remain. |
| AC | 15 | Happy-path acceptance flows now pass through runtime checks. Production acceptance still blocked by Telegram bot, storage, migrations and ownership. |

## Updated Completion Estimate

This is a functional-readiness estimate, not a line-count estimate:

| Bucket | Approx. requirements | Percent |
| --- | ---: | ---: |
| Implemented enough for V1 skeleton/runtime demo | 132 | 49% |
| Partially implemented, needs production hardening or missing sub-flow | 72 | 27% |
| Not implemented yet | 65 | 24% |

Production-readiness estimate after blocks 1-8: about 55-60%.

## What Is Now Solid

- Telegram initData auth foundation and local preview guard.
- Guest request secure token, rotate/revoke and guest-safe detail.
- Dealer referral public landing, tools, rotate, request visibility and summary.
- Store application/profile/status/inbox and store-scoped offer privacy.
- Offer full-list validation, material subtotal + delivery + final total.
- Customer one-off offer selection, order creation and finance trigger.
- Order transition guard, delivery proof and customer confirmation.
- Finance ledger, payment history, no-overpay and summary debt fields.
- Admin moderation guard, audit filters, report summary and CSV export.
- Notification outbox due/claim/retry/dead-letter model.
- File upload type/size/safe-name/private-stream basics.

## Main Remaining V1 Work

1. **AUTH/TEL ownership binding**
   - Browser login nonce + “Open Telegram” / QR login.
   - Real Telegram webhook validation and idempotent processing.
   - Bind verified Telegram users to dealer/store/customer ownership.
   - Admin revoke-all-sessions and role switcher polish.

2. **Customer secure page completion**
   - Guest page should show offer progress, order status, selected order and problem/cancel actions.
   - Customer contact/delivery detail must be required before selection confirmation.
   - Dispute/problem flow needs customer-facing endpoint and UI.

3. **Finance depth**
   - Dealer payout workflow.
   - Store/dealer statements.
   - Debt due date and aging buckets.
   - Adjustments, reversals, waivers and disputed finance freeze.

4. **Admin operations**
   - Real dispute resolution workflow.
   - User/role/session management UI.
   - Region/category/settings management.
   - Operational assignment, support notes, override actions and suspension impact preview.

5. **NFR/production readiness**
   - Rate limiting and request throttling.
   - OpenAPI docs.
   - Structured migrations instead of relying on dev synchronize.
   - Automated API tests for critical flows.
   - Observability/health page for Telegram, storage and notification worker.
   - Backup/restore/runbook.

## Recommended Next Blocks

1. Block 9: API security hardening, rate limit, ownership context, health/integration status.
2. Block 10: Customer secure page completion: offers/order/cancel/dispute.
3. Block 11: Telegram bot webhook and browser login nonce.
4. Block 12: Finance payouts/statements/aging.
5. Block 13: Admin settings, support notes and dispute resolution.
6. Block 14: OpenAPI, migrations and automated smoke tests.

## Decision

Continue with Block 9 first because it reduces cross-cutting risk for all remaining V1 flows. The most important gap is not another screen; it is that local-preview role headers still stand in for real production ownership and abuse protection.
