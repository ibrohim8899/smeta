# 18 - TZ progress analysis va keyingi qadamlar

Asl TZ qayta ko'rildi: unda 269 ta explicit requirement bor. Hozirgi loyiha V1 production emas, lekin core marketplace skeleti ishlayapti.

## Umumiy baho

- Functional skeleton: taxminan 35-40%.
- Production-ready V1: taxminan 20-25%.
- Eng kuchli tugallangan yo'nalish: request -> store assignment -> offer -> customer selection -> order -> finance ledger skeleton.
- Eng katta bo'shliqlar: Telegram auth/session, guest token security, ownership/IDOR checks, store/dealer application lifecycle, proof/final amount, dispute, append-only finance, worker/bot, migrations/tests/OpenAPI.

Bu foizlar requirement sonini matematik sanash emas; koddagi real ishlayotgan oqim, endpointlar, entitylar, frontend ekranlar va security/production tayyorgarligi bo'yicha muhandislik bahosi.

## Bitgan yoki ishlaydigan qismlar

- Monorepo, NestJS API, React web, shared constants, PostgreSQL config.
- Material request yaratish, list/detail, status moderation, cancel.
- Multipart upload: file count/size/type policy, safe local storage, private download endpoint.
- Store seed/list/create va requestni storelarga assign qilish.
- Offer yaratish/list qilish.
- Customer bitta offer tanlashi va order yaratilishi.
- Order statuslari va basic fulfilment screen.
- Completed orderdan finance ledger snapshot yaratish.
- Finance summary va partial/full payment yozish.
- Dealer entity, referral code, request attribution snapshot.
- Permission matrix, global guard skeleton, audit log skeleton.
- Notification outbox skeleton.
- Web dashboard va asosiy feature ekranlar real APIga ulangan.

## Yarim bitgan qismlar

- Auth/role: guard bor, lekin real Telegram initData/session/refresh/logout/revocation yo'q.
- Customer guest flow: request yaratadi, lekin secure guest token/link hash modeli yo'q.
- Dealer: referral attribution bor, lekin QR/share, assisted flow, earning/payout history va support yo'q.
- Store: store/offers bor, lekin store application/profile/inbox ownership, decline/withdraw/revision to'liq emas.
- Order: statuslar bor, lekin allowed transition matrix, accept timeout, proof upload, final amount verification va customer confirmation yo'q.
- Finance: ledger bor, lekin append-only debt/payment/earning/payout model, allocation, reversal/adjustment va maker-checker yo'q.
- Admin: request/store/dealer/finance ko'rinishlari bor, lekin approval, dispute, filters/export/settings/audit viewer hali boshlang'ich.
- Notifications: outbox bor, lekin real Telegram worker, retry/backoff va template registry yo'q.
- Files: local private download bor, lekin S3, checksum, antivirus worker, preview, signed URL yo'q.
- NFR: build/typecheck bor, lekin migrations, automated tests, OpenAPI, rate limit, observability, backup/runbook hali yetarli emas.

## Hali bitmagan asosiy bloklar

- `AUTH-001..018`: Telegram-first controlled-role identity va session lifecycle.
- `CUS-010`, `CUS-017..023`, `CUS-024..028`: secure guest page, confirmation, cancellation, dispute, history, assisted flow.
- `DLR-004`, `DLR-008..020`: dealer dashboardning earning/payout/support qismi.
- `STR-001..008`, `STR-012..030`: store application/profile/inbox/decline/revision/order proof/debt statement.
- `CORE`: transaction integrity, recipient visibility, deadline/expiry, final amount/proof/dispute lifecycle.
- `FIN`: append-only accounting, payment allocation, payout, reversal, debt aging, reports.
- `ADM`: applications, disputes, settings, exports, audit search, support notes, health/integration status.
- `TEL/NOT`: bot, webhook, worker, retry, notification preferences.
- `FILE/RPT/NFR`: S3/private storage hardening, reports, migrations, tests, OpenAPI, rate limiting, observability.

## Bu etapda bajarildi

TZdagi `STR-010`, `CUS-013`, `AC-004` va finance formulasiga yaqinlashtirish uchun offer modeli tuzatildi:

- offer endi `materialSubtotalUzs`, `deliveryFeeUzs`, `deliveryEstimate`, `completeListAvailable` maydonlarini qabul qiladi;
- backend `finalTotalUzs = materialSubtotalUzs + deliveryFeeUzs` hisoblaydi;
- eski `totalAmountUzs` javob mosligi uchun saqlanadi, lekin endi yakuniy payable total sifatida ishlaydi;
- customer selection ekrani material subtotal, delivery va final totalni alohida ko'rsatadi;
- finance commission base endi delivery fee qo'shilgan final totaldan emas, material subtotaldan olinadi.

Qo'shimcha offer lifecycle hardening:

- offer yaratishdan oldin do'kon aynan shu requestga biriktirilgani tekshiriladi;
- inactive store offer yubora olmaydi;
- declined/withdrawn opportunity qayta ishlatilmaydi;
- tanlov boshlangan offer qayta tahrirlanmaydi;
- store requestni decline qilishi uchun endpoint qo'shildi;
- unselected submitted offerni withdraw qilish uchun endpoint qo'shildi;
- withdrawn yoki submitted bo'lmagan offer customer selection orqali tanlanmaydi;
- decline/withdraw amallari audit va notification outboxga yoziladi.

## Keyingi bajarish rejam

1. Store offer lifecycle:
   - assigned store tekshiruvi;
   - bitta store/request uchun bitta active offer;
   - decline, withdraw, revise endpointlari;
   - store-scoped DTO, raqib narxlarini yashirish.

2. Order fulfilment hardening:
   - allowed status transition matrix;
   - accept/decline;
   - final material subtotal + delivery fee submission;
   - proof upload endpoint;
   - dispute freeze.

3. Guest/customer security:
   - secure request token;
   - token hash storage;
   - customer-only request page DTO;
   - contact/address release only after accepted store.

4. Finance V1 accounting:
   - store debt ledger row va dealer earning rowni ajratish;
   - immutable adjustment/reversal;
   - payment allocation;
   - dealer payout states.

5. Telegram/auth:
   - initData verification;
   - session/refresh/revocation;
   - actor propagation to audit;
   - role/account status enforcement.

6. Production discipline:
   - TypeORM migrations;
   - unit/integration/E2E tests;
   - OpenAPI;
   - rate limit;
   - structured error codes;
   - deployment/runbook docs.

## Tekshiruv

- `npm run typecheck` muvaffaqiyatli o'tdi.
- `npm run build` muvaffaqiyatli o'tdi.
