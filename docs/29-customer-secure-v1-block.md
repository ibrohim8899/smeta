# 29 - Customer secure V1 block

Date: 2026-08-13

Scope: TZ V1 customer secure link flow only.

## Implemented

- Guest secure link now supports customer contact update before offer selection.
- Guest link can fetch privacy-safe offers without store phone, address, admin note, or commission fields.
- Guest link can select a submitted complete offer and create an order through the existing order service.
- Offer selection is idempotent: repeated selection after an order exists returns the existing order instead of creating a duplicate.
- Guest link can fetch its own order by token.
- Guest link can cancel a request/order before dispatched delivery stages.
- Guest link can open a dispute with a required reason.
- Guest link can confirm delivered orders, which completes the order/request and creates the finance ledger snapshot.
- Web guest request page now includes contact, offers, order status, cancel, dispute, and delivery confirmation controls.

## Guardrails

- Token ownership is checked before every guest action.
- Offer responses expose only store id/name and public offer pricing/delivery fields.
- Contact phone is required before guest offer selection.
- Guest cancellation is blocked after dispatched/delivered/completed stages and directs the customer to dispute flow.
- Existing order transition and finance snapshot logic remains centralized in `OrdersService`.

## Verification

- `npm run typecheck` passed.
- `npm run build` passed.
- Runtime smoke passed:
  - guest request created,
  - store offer created,
  - selection without phone blocked,
  - phone/contact saved,
  - offer selected,
  - order progressed to delivered pending confirmation,
  - guest confirmed delivery,
  - finance ledger snapshot created,
  - separate guest cancel returned `canceled`,
  - separate guest dispute returned `disputed`.

## Remaining V1 Work

- Continue with the next TZ V1 block after customer approval: admin operational polish and end-to-end UX gaps that are still marked partial/missing in the reanalysis.
