# 21. Dealer Referral Block

Date: 2026-08-13

Scope: TZ V1 dealer/referral requirements only.

## Completed

- Public referral lookup now exposes only approved and active dealers.
- Dealer responses include referral link, QR payload, and Telegram share URL.
- Admin/dealer dashboard can fetch referral tools, attributed requests, and summary metrics.
- Referral code can be rotated with audit and notification events.
- Attributed requests are masked and business-oriented: customer phone is partially hidden and offer prices are not exposed.
- Referral landing page opens from `?ref=CODE`, validates the dealer, and starts the guest customer request flow with dealer data prefilled.
- Dealer UI was strengthened with:
  - referral copy/share controls,
  - rotation action,
  - QR payload panel,
  - selected dealer details,
  - referred request list,
  - conversion/earning summary.

## Runtime Checks

- `GET /health`: ok.
- `GET /dealers`: returned dealer list with `qrPayload` and `telegramShareUrl`.
- `GET /dealers/referral/USTA-JAM-24`: returned approved public referral profile.
- `GET /dealers/:id/referral-tools`: returned link, share text, Telegram URL, and QR payload.
- `GET /dealers/:id/requests`: returned masked attributed request data.
- `GET /dealers/:id/summary`: returned referral counts and earning totals.
- Referral rotation was tested on a new QA dealer:
  - old code lookup returned `404`,
  - new code lookup returned `approved`.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- API dev server: `http://localhost:4000`.
- Web dev server: `http://localhost:5173`.

## Remaining Dealer-Scope Gaps

- Real Telegram Mini App dealer application identity still depends on production bot/session setup.
- QR is currently a scannable payload/link field, not a generated QR image/download.
- Dealer payout history is summarized, but detailed per-payout UI is still basic.
- Suspicious self-referral/fraud heuristics are not implemented yet.
- Finance ledger now stores a dealer ID snapshot for new rows; old rows still use display-name fallback.
