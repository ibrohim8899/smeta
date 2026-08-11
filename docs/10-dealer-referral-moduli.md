# 10 - Dealer/usta referral moduli

TZ qayta tahlilidan keyin keyingi muhim bosqich sifatida dealer/usta referral moduli real qilindi.

## Backend

Yangi modul:

- `DealersModule`
- `DealersService`
- `DealersController`
- `DealerEntity`

Yangi endpointlar:

- `GET /dealers` - ustalar ro'yxati.
- `POST /dealers` - yangi usta arizasi.
- `GET /dealers/referral/:referralCode` - referral code bo'yicha usta topish.
- `PATCH /dealers/:id/status` - admin usta statusini o'zgartiradi.

Default seed:

- `Usta Jamshid` - `USTA-JAM-24`
- `Usta Akmal` - `USTA-AKM-24`

## Request attribution

Material request yaratishda `dealerReferralCode` yuborilsa:

- backend approved va active referralga ega ustani topadi;
- requestga dealer relation yoziladi;
- dealer ismi va referral code snapshot qilinadi;
- keyingi finance hisob-kitoblar shu snapshotga tayana oladi.

## Frontend

`Ustalar` sahifasi demo emas, real API bilan ishlaydi:

- ustalar ro'yxatini ko'rsatadi;
- yangi usta arizasi yaratadi;
- admin tasdiqlash/to'xtatish amallarini bajaradi;
- referral linkni ko'rsatadi.

Mijoz so'rovi formasiga `Referral kodi` maydoni qo'shildi.

## TZ mosligi

Bu etap quyidagi talablar uchun poydevor:

- `DLR-001` - dealer application
- `DLR-002` - dealer approval status
- `DLR-003` - unique referral identity
- `DLR-004` - shareable referral tools
- `DLR-005` - referral capture and snapshot
- `DLR-006` - one dealer per request
- `CUS-001` - dealer referral landing
- `AC-001` - guest referral request

## Hali qolgan qism

- Telegram bot orqali dealer arizasi;
- QR image yaratish/download;
- dealer earning transaction history;
- payout details/history;
- dealer support notes;
- suspicious self-referral review;
- real auth/permission guard.
