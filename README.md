# Smeta Market V1

Telegram-first procurement and commission-control platform for construction materials.

## Stack

- API: NestJS, TypeORM, PostgreSQL
- Web: React, TypeScript, Tailwind CSS
- Shared: workspace package for roles, statuses, constants
- Timezone: Asia/Tashkent
- Currency: UZS

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start local PostgreSQL and create the app database.

```text
database: smeta_market
user: smeta
password: ibrohim
port: 5432
```

On this machine PostgreSQL 18 is used. To prepare the local database:

```powershell
$env:PGPASSWORD='ibrohim'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f 'C:\Users\user\Desktop\smeta\scripts\setup-local-postgres.sql'
& 'C:\Program Files\PostgreSQL\18\bin\createdb.exe' -h localhost -p 5432 -U postgres -O smeta smeta_market
```

3. Start the apps:

```bash
npm run dev
```

API health check:

```text
http://localhost:4000/health
```

Web app:

```text
http://localhost:5173
```

## Stage 1 scope

This first stage prepares the project foundation:

- monorepo workspace
- backend app shell
- frontend app shell
- shared constants package
- PostgreSQL environment
- Docker Compose database definition
- health endpoint
- initial product palette
