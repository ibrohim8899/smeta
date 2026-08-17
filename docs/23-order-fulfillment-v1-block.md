# 23. Order Fulfillment V1 Block

Date: 2026-08-13

Scope: TZ V1 customer offer selection, order fulfillment, delivery proof, customer confirmation, and finance trigger.

## Completed

- Added `orders.confirm` permission and assigned it to customer role.
- Order entity now stores V1 fulfillment fields:
  - final amount,
  - delivery proof note,
  - delivery proof file name,
  - delivered timestamp,
  - customer confirmed timestamp.
- Order creation initializes final amount from the selected offer total.
- Order status updates now enforce transition rules:
  - no arbitrary status jumps,
  - no direct `completed` through fulfillment endpoint,
  - terminal statuses cannot move forward.
- Delivery status now requires proof note or proof file name before moving to `delivered_pending_confirmation`.
- Customer confirmation endpoint was added: `POST /orders/:orderId/confirm-delivery`.
- Finance snapshot is now created only after customer confirmation.
- Customer selection UI now shows final amount, proof, and confirmation time.
- Order fulfillment UI now includes:
  - final amount input,
  - proof note,
  - proof file name,
  - saved proof display,
  - status buttons disabled by valid transition rules,
  - separate customer confirmation button.

## Runtime Checks

QA flow created a fresh request/order and verified:

- Request created with attachment metadata: `REQ-00013`.
- Store assignment succeeded.
- Store offer created with material subtotal and delivery fee.
- Customer selected the offer and order was created: `ORD-00003`.
- Direct `completed` status update returned `400`.
- Valid transitions succeeded:
  - `pending_store_acceptance -> accepted`,
  - `accepted -> preparing`,
  - `preparing -> ready`,
  - `ready -> dispatched`.
- Delivery without proof returned `400`.
- Delivery with proof moved to `delivered_pending_confirmation`.
- Customer confirmation moved order to `completed`.
- Finance ledger row was created after confirmation.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- API dev server: `http://localhost:4000`.
- Web dev server: `http://localhost:5173`.

## Remaining Order-Scope Gaps

- Proof file is currently stored as a file-name/reference field; real upload/download ACL belongs to the storage block.
- Customer ownership is still local-preview role based until production Telegram sessions are bound to request/order ownership.
- Dispute resolution details are basic and should be expanded in the dispute/admin block.
- Delivery route, courier identity, and payment collection details are not implemented unless explicitly present in V1 scope.
