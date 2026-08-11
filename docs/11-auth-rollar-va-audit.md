# 11 - Auth, rollar va audit skeletoni

Bu etap TZdagi role model, permission va audit talablariga tayanch yaratadi. Hozircha real Telegram login majburiy emas: lokal preview orqali rollar va ruxsatlar tekshiriladi, keyingi etapda Telegram Mini App sessiyasi shu qatlamga ulanadi.

## Backend

Yangi modullar:

- `AuthModule`
- `AuditModule`

Yangi endpointlar:

- `GET /auth/me` - joriy rol preview va permissionlar.
- `GET /auth/permissions` - barcha rollar bo'yicha permission matritsa.
- `GET /audit?limit=80` - oxirgi audit yozuvlari.

`users` jadvaliga keyingi auth uchun tayanch maydonlar qo'shildi:

- `status`
- `telegram_user_id`
- `telegram_username`
- `last_login_at`

## Permission matritsa

Umumiy permissionlar `packages/shared` ichiga chiqarildi:

- request yaratish, ko'rish, moderatsiya qilish, do'konlarga yuborish;
- offer yaratish, ko'rish, tanlash;
- order ko'rish va fulfillment;
- dealer arizasi, ko'rish, moderatsiya;
- finance o'qish va to'lov yozish;
- audit o'qish;
- settings boshqarish.

Rollar:

- `customer`
- `dealer`
- `store`
- `admin`
- `finance`
- `superadmin`

## Auditga ulangan amallar

Quyidagi real mutationlar avtomatik audit yozadi:

- material request yaratish;
- material request statusini o'zgartirish;
- requestni do'konlarga yuborish;
- store offer yaratish yoki yangilash;
- offer tanlanib order yaratish;
- order statusini o'zgartirish;
- finance snapshot yaratish;
- finance payment yozish;
- dealer arizasi yaratish;
- dealer statusini o'zgartirish.

## Frontend

Yangi sahifa:

- `Xavfsizlik`

Sahifada:

- rol tanlash;
- tanlangan rol permissionlarini ko'rish;
- audit tarixini ko'rish;
- audit ro'yxatini yangilash.

## Tekshiruv

Tekshirildi:

- `npm run typecheck`
- `npm run build`
- `GET /health`
- `GET /auth/me`
- `GET /auth/permissions`
- `GET /audit`
- test material request yaratish va status o'zgartirish orqali audit yozilishi.

Test yozuvi:

- `REQ-00007`
- audit yozuvlari: `material_request.created`, `material_request.status_updated`

## Keyingi qolgan ish

- Telegram Mini App `initData` verification;
- real session/JWT yoki secure session cookie;
- route-level permission guardni barcha protected endpointlarga bosqichma-bosqich ulash;
- user/profile mapping: customer, dealer, store account;
- audit actorini real userdan olish;
- rate limit va security hardening.
