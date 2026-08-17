# 24. Finance V1 Block

Date: 2026-08-13

Scope: TZ V1 finance ledger, store debt, dealer reward, payment recording, and finance audit controls.

## Completed

- Finance ledger response now includes:
  - `remainingDebtUzs`,
  - `dealerId`,
  - payment history rows.
- Added separate append-style payment records in `finance_payments`.
- Added payment history endpoint: `GET /finance/ledger/:ledgerId/payments`.
- Payment recording now creates a separate payment row every time.
- Payment audit now points to the finance payment record and includes ledger ID, paid amount, remaining debt, and status.
- Overpayment remains blocked.
- Already-paid ledgers can no longer receive extra payments.
- Ledger status is derived from paid amount:
  - `payable`,
  - `partial_paid`,
  - `paid`.
- Finance summary now separates:
  - total store debt,
  - remaining store debt,
  - paid amount,
  - platform commission,
  - dealer reward,
  - platform net.
- Finance UI now shows:
  - total debt and remaining debt separately,
  - remaining debt per ledger row,
  - selected ledger total debt / paid / remaining,
  - payment history for the selected ledger.

## Runtime Checks

Tested against `FIN-00002`:

- Partial payment of `100000` UZS succeeded.
- Ledger moved to `partial_paid`.
- Remaining debt became `455000` UZS.
- Overpayment attempt returned `400`.
- Final payment of `455000` UZS succeeded.
- Ledger moved to `paid`.
- Remaining debt became `0`.
- Payment history endpoint returned 2 payment rows.
- Finance summary returned `remainingDebtUzs = 0` and `paidCount = 2`.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- API dev server: `http://localhost:4000`.
- Web dev server: `http://localhost:5173`.

## Remaining Finance-Scope Gaps

- Payment reversal/refund is not implemented; V1 currently treats finance payments as append-only positive receipts.
- Dealer payout settlement is summarized through dealer reward but does not yet have a separate payout workflow.
- Payment method/reference fields can be added if TZ V1 requires bank/cash/receipt metadata explicitly.
- Production export/reporting belongs to the reporting/admin block.
