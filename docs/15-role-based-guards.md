# 15 - Role-based guards va endpoint permissionlari

Bu etapda auth/role skeletoni real endpointlarga ulandi. Hozir Telegram/JWT sessiya hali yo'q, lekin har bir himoyalangan API endpoint qaysi permission talab qilishini aniq biladi.

## Backend

Yangi fayllar:

- `auth/require-permissions.decorator.ts`
- `auth/permissions.guard.ts`

`PermissionsGuard` global guard sifatida ulandi:

- permission belgilanmagan endpointlar public qoladi;
- `@RequirePermissions(...)` bo'lgan endpointlar `x-smeta-role` headeridagi rol orqali tekshiriladi;
- development rejimda header bo'lmasa `superadmin` fallback ishlaydi;
- production rejimda header/sessiya bo'lmasa 403 qaytadi.

## Permission matritsa

Qo'shilgan yangi permissionlar:

- `stores.read`
- `stores.manage`
- `notifications.read`
- `notifications.manage`

Rollar moslandi:

- admin: store, notification, request moderation, audit va dealer moderation ruxsatlari;
- store: request/store/offer/order fulfillment ruxsatlari;
- finance: finance va audit o'qish, notification o'qish;
- superadmin: hamma permissionlar.

## Himoyalangan endpointlar

Material request:

- create: `requests.create`
- list/detail/download: `requests.read`
- status/cancel: `requests.moderate`

Store:

- list: `stores.read`
- create: `stores.manage`

Offer:

- assign stores: `requests.assign_stores`
- recipients: `requests.read`
- create offer: `offers.create`
- read offers: `offers.read`

Order:

- select offer: `offers.select`
- read orders: `orders.read`
- update fulfillment status: `orders.fulfill`

Dealer:

- apply: `dealers.apply`
- list: `dealers.read`
- moderate: `dealers.moderate`
- referral lookup public qoldi.

Finance:

- read ledger/summary: `finance.read`
- snapshot/payment: `finance.record_payment`

Audit:

- read: `audit.read`

Notifications:

- read: `notifications.read`
- create/update status: `notifications.manage`

## Frontend

Frontend API helper dev preview uchun `x-smeta-role` headerini yuboradi.

Default:

- `VITE_SMETA_ROLE` bo'lmasa `superadmin`

`Xavfsizlik` sahifasida permission matritsa yangilandi va header preview haqida izoh qo'shildi.

## Tekshiruv

Tekshirildi:

- `npm run typecheck`
- `npm run build`
- web `http://localhost:5173` 200
- API health OK
- `customer` roli `GET /finance/summary` uchun 403 oldi
- `finance` roli `GET /finance/summary`ni ochdi
- `admin` roli `GET /notifications`ni ochdi
- `store` roli `GET /audit` uchun 403 oldi

## Hali qolgan ish

- real Telegram Mini App initData verification;
- JWT/session cookie;
- actor id/role auditga requestdan tushishi;
- role ownership checks: store faqat o'z request/offer/orderini ko'rishi;
- customer faqat o'z requestini ko'rishi;
- dealer faqat o'z referral oqimini ko'rishi;
- productionda dev fallbackni o'chirish.
