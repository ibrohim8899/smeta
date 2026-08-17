# 19 - Auth / Telegram identity bloki

Bu bosqich faqat TZ V1 ichidagi `AUTH` talablariga qaratildi. Maqsad: passwordga tayanmagan, server-side Telegram verificationga tayyor, status/role asosida permission beradigan auth poydevorini qilish.

## Tahlil qilingan muammolar

- Auth faqat `x-smeta-role` development preview headeriga tayangan edi.
- User entityda `email` va `password_hash` majburiy edi; V1 esa password auth bo'lmasligini talab qiladi.
- Telegram Mini App `initData` backendda tekshirilmas edi.
- Guard account statusni va verified sessionni bilmas edi.
- Logout/session revocation yo'q edi.
- Account statuslar ro'yxatida `rejected` va `archived` yo'q edi.

## Qilingan ishlar

- `POST /auth/telegram/exchange` qo'shildi.
- Telegram `initData` serverda HMAC signature, `auth_date`, `user` payload bo'yicha tekshiriladi.
- `TELEGRAM_BOT_TOKEN` bo'lmasa endpoint aniq konfiguratsiya xatosi qaytaradi; productionda client bergan Telegram IDga ishonilmaydi.
- Telegram user `telegram_user_id` bo'yicha upsert qilinadi.
- Controlled role faqat `active` account va tasdiqlangan role bo'lsa session oladi.
- Session token HMAC bilan imzolanadi, 15 daqiqalik TTL bilan yaratiladi.
- Session token hash ko'rinishida `auth_sessions` jadvalida saqlanadi.
- `POST /auth/logout` current sessionni revoked qiladi.
- Permission guard avval `x-smeta-session` verified tokenni tekshiradi.
- `x-smeta-role` preview faqat `NODE_ENV=development`da qoladi.
- User entityda password/email nullable bo'ldi; `roles` simple-array qo'shildi.
- `SUPERADMIN_TELEGRAM_USER_ID`, `ACCESS_TOKEN_TTL_SECONDS`, `TELEGRAM_AUTH_MAX_AGE_SECONDS` env sozlamalari qo'shildi.
- Shared account statuslar `pending`, `active`, `rejected`, `suspended`, `blocked`, `archived`ga kengaydi.
- Web API clientda Telegram exchange response type va wrapper qo'shildi.

## Qamrab olingan AUTH talablar

- `AUTH-001` / `AUTH-002`: Telegram initData serverda tekshirish poydevori.
- `AUTH-005`: role access account statusga bog'landi.
- `AUTH-010`: password auth V1 asosiy yo'lidan chiqarildi.
- `AUTH-011`: superadmin Telegram ID orqali bootstrapga tayyorlandi.
- `AUTH-012`: userda ko'p role saqlash modeli boshlandi.
- `AUTH-014`: active bo'lmagan account session olmaydi.
- `AUTH-018`: reusable guard/policy yo'li kuchaydi.

## Hali jonli qilish uchun kerak

- Real `TELEGRAM_BOT_TOKEN`.
- Real `SUPERADMIN_TELEGRAM_USER_ID`.
- Production uchun kuchli `JWT_ACCESS_SECRET`.
- TypeORM migration: `users.roles`, nullable password/email, `auth_sessions` jadvali.
- Telegram bot / Mini App frontenddan `window.Telegram.WebApp.initData`ni `/auth/telegram/exchange`ga yuborish.

## Tekshiruv

- `npm run typecheck` muvaffaqiyatli o'tdi.
- `npm run build` muvaffaqiyatli o'tdi.
- `GET /health` database bilan `ok`.
- `GET /auth/me` development preview bilan ishladi.
- Customer role `GET /finance/summary` uchun `403` oldi.
- `POST /auth/telegram/exchange` token yo'qligida `TELEGRAM_BOT_TOKEN sozlanmagan` deb aniq xato qaytardi.
