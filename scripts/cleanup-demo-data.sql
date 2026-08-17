-- Local/staging cleanup before real testing.
-- Keeps app settings and the Telegram superadmin user/session, then removes
-- generated QA/smoke/demo business data.

BEGIN;

TRUNCATE TABLE
  finance_adjustments,
  finance_payments,
  finance_payouts,
  finance_ledger,
  notification_outbox,
  orders,
  store_offers,
  request_recipients,
  request_attachments,
  material_requests,
  dealers,
  stores,
  audit_logs
RESTART IDENTITY CASCADE;

DELETE FROM auth_login_nonces;
DELETE FROM telegram_updates;

DELETE FROM auth_sessions s
WHERE s."userId" NOT IN (
  SELECT u.id
  FROM users u
  WHERE u.telegram_user_id = :'superadmin_telegram_user_id'
);

DELETE FROM users u
WHERE u.telegram_user_id IS DISTINCT FROM :'superadmin_telegram_user_id';

COMMIT;
