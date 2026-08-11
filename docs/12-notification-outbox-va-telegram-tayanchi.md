# 12 - Notification outbox va Telegram tayanchi

Bu etapda Telegram token talab qilmaydigan notification poydevori yaratildi. Hozir barcha bildirishnomalar `notification_outbox` jadvaliga yoziladi; keyingi Telegram etapida worker/bot shu navbatdagi `pending` yozuvlarni real yuboradi.

## Backend

Yangi modul:

- `NotificationsModule`

Yangi endpointlar:

- `GET /notifications?limit=100`
- `GET /notifications?status=pending`
- `POST /notifications`
- `PATCH /notifications/:id/status`

Outbox maydonlari:

- kanal: `web`, `telegram`
- qabul qiluvchi roli
- qabul qiluvchi reference
- event turi
- o'zbekcha sarlavha va matn
- status: `pending`, `sent`, `failed`, `skipped`
- urinishlar soni
- oxirgi xato
- metadata
- scheduled/sent vaqtlar

## Avtomatik notification eventlari

Quyidagi holatlarda notification yaratiladi:

- yangi material request kelganda admin uchun;
- request statusi o'zgarganda mijoz uchun;
- request do'konlarga yuborilganda har bir do'kon uchun;
- do'kon offer yaratganda yoki yangilaganda admin uchun;
- offer tanlanib order yaratilganda do'kon uchun;
- order statusi o'zgarganda mijoz uchun;
- finance snapshot yaratilganda finance uchun;
- finance payment yozilganda finance uchun;
- dealer arizasi kelganda admin uchun;
- dealer statusi o'zgarganda dealer uchun.

## Frontend

Yangi sahifa:

- `Bildirishnomalar`

Sahifada:

- notification ro'yxatini ko'rish;
- status bo'yicha filter qilish;
- manual test bildirishnoma yaratish;
- statusni `sent`, `failed`, `skipped` qilib belgilash;
- yuqori headerdagi qo'ng'iroq tugmasi shu sahifaga ochadi.

## Tekshiruv

Tekshirildi:

- `npm run typecheck`
- `npm run build`
- `GET /notifications`
- `POST /notifications`
- `PATCH /notifications/:id/status`
- real material request yaratish orqali notification avtomatik tushishi.

Test yozuvi:

- `REQ-00008`
- notification: `material_request.created`

## Keyingi qolgan ish

- Telegram bot token bilan real yuboruvchi worker;
- retry/backoff siyosati;
- deadline reminder job;
- notification template registry;
- user/channel preference;
- delivered/read tracking.
