# Smeta Market V1 Operations Runbook

## Required Production Configuration

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`
- `SUPERADMIN_TELEGRAM_USER_ID`
- `INTERNAL_WORKER_SECRET`
- `WEB_APP_URL`
- S3-compatible storage variables when production file storage is enabled.

## Deploy

1. Install dependencies with `npm install`.
2. Build with `npm run build`.
3. Run database migrations with `npm run migration:run --workspace @smeta/api`.
4. Start the API with `npm run start --workspace @smeta/api`.
5. Serve the web build from `apps/web/dist`.
6. Check `GET /health` and protected `GET /health/integrations`.

## Worker Triggers

Call these endpoints from cron, scheduler or an internal worker using `x-internal-worker-secret`.

- `POST /internal/notifications/process`
- `POST /internal/deadlines/process`
- `POST /internal/files/cleanup`

Suggested frequency:

- Notifications: every 1 minute.
- Deadlines: every 5 minutes.
- File cleanup: hourly.

## Local Telegram Login Testing

Telegram cannot call a localhost webhook directly. During local testing, run the API and web app, then run:

```powershell
npm run telegram:poll
```

This polls Telegram `getUpdates` and forwards updates to the local API webhook endpoint. Production should use a real public HTTPS webhook instead.

## Rollback

1. Stop new deploy traffic.
2. Restore the previous application image/build.
3. If a migration must be reverted, run `npm run migration:revert --workspace @smeta/api` only after confirming no irreversible data changes were introduced.
4. Re-check `/health` and `/health/integrations`.

## Backup And Restore

- Back up PostgreSQL before each production migration.
- Back up private object storage metadata and files according to the business retention policy.
- Test restore in staging before pilot launch.

## Demo Cleanup

Old automatic seed rows can be removed with:

```powershell
$env:PGPASSWORD='<password>'
psql -h <host> -p <port> -U <user> -d <db> -v ON_ERROR_STOP=1 -f scripts/cleanup-demo-data.sql
```

The script deletes only known seed rows and skips rows that are already referenced by business records.
