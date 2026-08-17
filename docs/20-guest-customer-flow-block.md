# 20 - Guest customer flow bloki

Bu bosqich faqat TZ V1 ichidagi guest customer talablariga qaratildi: mijoz registratsiyasiz so'rov yaratishi, secure link orqali o'z so'rovini ko'rishi va ichki/admin/finance ma'lumotlar ochilmasligi.

## Tahlil qilingan muammolar

- Guest customer request yaratish endpointi protected permission talab qilardi.
- Guest link/token umuman yo'q edi.
- Request ID bilan ochish faqat admin/store kabi `requests.read` permissionga bog'liq edi.
- Token hash storage, revoke/rotate va expiry yo'q edi.
- Guest request filesiz ham yaratilishi mumkin edi.
- Frontend secure status linkni ko'rsatmas edi.

## Qilingan ishlar

- Public guest create flow uchun `POST /material-requests` va `POST /material-requests/with-files`dan permission talabi olib tashlandi.
- Guest request yaratishda 32-byte high-entropy token generatsiya qilinadi.
- DBda faqat `guest_token_hash` saqlanadi.
- `guest_token_expires_at` va `guest_token_revoked_at` qo'shildi.
- Create response tokenni faqat bir marta `guestAccessToken` va `guestAccessUrl` sifatida qaytaradi.
- `GET /material-requests/guest/:token` customer-safe DTO qaytaradi.
- `POST /material-requests/guest/:token/rotate` compromised linkni almashtiradi.
- `POST /material-requests/guest/:token/revoke` guest linkni bekor qiladi.
- `GET /material-requests/guest/:token/attachments/:attachmentId/download` guest token bilan attachment download qiladi.
- Guest-safe DTO `adminNote`, `phone`, `storageKey`, commission yoki internal ma'lumotlarni qaytarmaydi.
- Filesiz guest request backendda `400` bilan rad qilinadi.
- Customer request UI secure status linkni ko'rsatadi.
- Customer request UI filesiz submitni bloklaydi.
- `?guestToken=...` bilan kirilganda `GuestRequestView` mijozga mos status sahifasini ochadi.
- Privacy notice qo'shildi: fayllar faqat tasdiqlangan do'konlarga, telefon/manzil esa g'olib do'kon qabul qilmaguncha yashiriladi.
- `GUEST_REQUEST_TOKEN_LIFETIME_DAYS=90` env sozlamasi qo'shildi.

## Qamrab olingan TZ talablar

- `AUTH-006`: customer guest access secure request token bilan boshlandi.
- `AUTH-016`: guest token high-entropy va hash storage modeli.
- `CUS-002`: no-registration primary flow uchun endpoint public qilindi.
- `CUS-003`: kamida bitta material-list attachment majburiy qilindi.
- `CUS-008`: frontend privacy notice qo'shildi.
- `CUS-009`: request number va secure open link qaytadi.
- `CUS-010`: secure link faqat tegishli requestning customer-safe detailini ochadi.
- `CUS-027`: referral/public route customer detailni tokenlarsiz ochmaydi.
- `AC-001`: guest referral request uchun secure status link poydevori.

## Hali keyingi customer/order bloklariga qoladi

- Guest secure sahifada real offer comparison va selected order timeline.
- Customer contact confirmation before winning store.
- Optional Telegram attach.
- Draft preservation/local retry-safe upload.
- Plain Uzbek field-level error mapping.
- Customer cancellation/report problem.
- Token ownership bilan offer select qilish endpointi.

## Tekshiruv

- `npm run typecheck` muvaffaqiyatli o'tdi.
- `npm run build` muvaffaqiyatli o'tdi.
- `GET /health` database bilan `ok`.
- Filesiz guest request `400` qaytardi.
- Attachment metadata bilan guest request yaratildi va `guestAccessToken`/`guestAccessUrl` qaytdi.
- Token bilan `GET /material-requests/guest/:token` customer-safe DTO qaytardi.
- Token rotate qilingandan keyin eski token `404`, yangi token ishladi.
- Token revoke qilingandan keyin yangi token ham `404` qaytardi.
