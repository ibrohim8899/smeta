# 22. Store V1 Block

Date: 2026-08-13

Scope: TZ V1 store application, profile, inbox, and offer privacy rules.

## Completed

- Store entity now supports V1 lifecycle fields:
  - owner name,
  - address,
  - status,
  - admin note,
  - verified timestamp.
- Public store application endpoint was added: `POST /stores/apply`.
- Admin/store management endpoints were added:
  - `GET /stores/:id`,
  - `PATCH /stores/:id/profile`,
  - `PATCH /stores/:id/status`,
  - `GET /stores/:id/inbox`.
- Matching stores now require both `active = true` and `status = approved`.
- Offer creation now rejects suspended/unapproved stores.
- Store inbox returns only store-scoped data:
  - assigned requests,
  - masked customer display,
  - attachment metadata,
  - dealer referral summary,
  - only that store's own offer.
- Store role can no longer read every competitor offer without scope. `GET /material-requests/:requestId/offers` now requires `storeId` for store role and returns only that store's own offer.
- Store offer UI was strengthened with:
  - selected store profile/status panel,
  - store-scoped inbox panel,
  - current request recipient/offer status,
  - decline request action,
  - withdraw offer action,
  - clearer backend total preview.

## Runtime Checks

- `GET /health`: ok.
- `GET /stores`: returned old stores with new lifecycle fields and default `approved` status.
- `POST /stores/apply`: created a pending QA store.
- `PATCH /stores/:id/status`: approved the QA store, then archived it after the test.
- `GET /stores/:id/inbox`: returned store-scoped inbox.
- Store role request to `GET /material-requests/:requestId/offers` without `storeId` returned `400`.
- Store role request with `storeId` returned only scoped offers.
- Seed store inbox returned masked customer data and only its own offers.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed.
- API dev server: `http://localhost:4000`.
- Web dev server: `http://localhost:5173`.

## Remaining Store-Scope Gaps

- Production Telegram identity must bind a real store account to the store profile.
- Store ownership checks are still role/header based in local preview; production sessions should enforce account-to-store mapping.
- Real file download permissions for store inbox should be tightened when storage moves beyond local metadata.
- Detailed delivery proof/order fulfillment belongs to the order block, not this store onboarding/inbox block.
