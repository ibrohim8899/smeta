# 09 - TZ qayta analizi va keyingi ishlar

TZ boshidan qayta ko'rib chiqildi. Unda 269 ta aniq requirement bor:

- `AUTH` - 18 ta talab
- `CUS` - 28 ta talab
- `DLR` - 20 ta talab
- `STR` - 30 ta talab
- `CORE` - 30 ta talab
- `FIN` - 36 ta talab
- `ADM` - 40 ta talab
- `TEL/NOT/FILE/RPT` - 22 ta talab
- `NFR` - 30 ta talab
- `AC` - 15 ta acceptance scenario

## Hozir to'g'ri ketayotgan asosiy yo'nalish

Biz core marketplace loopni to'g'ri tartibda boshladik:

1. mijoz material so'rovi yaratadi;
2. admin so'rovni do'konlarga yuboradi;
3. do'kon taklif beradi;
4. mijoz bitta taklifni tanlaydi;
5. order yaratiladi;
6. order statuslari yuradi;
7. order yakunlanganda finance ledger yaratiladi.

Bu TZdagi `1.2 Primary success condition`, `3 End-to-End Business Workflows`, `CORE`, `CUS`, `STR`, `FIN` bloklariga mos keladi.

## Hali kuchli qolgan gaplar

### Auth va rollar

TZ bo'yicha V1 password login bo'lmasligi kerak. Controlled rolelar Telegram orqali tekshirilishi kerak. Hozir bizda faqat dev/admin seed bor. Keyingi haqiqiy productionga yaqin bosqichda:

- Telegram initData verification;
- role/account status;
- session lifecycle;
- server-side guards/policies;
- audit log;
- guest token hash;

qo'shilishi kerak.

### Dealer/usta moduli

Hozircha eng muhim bo'shliq shu: dealer referral hali real entity emas edi. TZda dealer:

- ariza beradi;
- admin tasdiqlaydi;
- unique referral code/link/QR oladi;
- requestga snapshot bo'lib yoziladi;
- offer narxlarini ko'rmaydi;
- earning/ledger history ko'radi.

Shuning uchun navbatdagi etap dealer modulini real qilish deb belgilandi.

### Store moduli

Do'konlar seed qilingan va taklif bera oladi, lekin hali:

- application/approval;
- store profile;
- confidential store-scoped inbox;
- delivery fee/final total;
- decline/withdraw/revision;
- proof/final amount;

to'liq emas.

### Fulfilment va proof

Order statuslari bor, lekin TZ bo'yicha hali kerak:

- store accept/decline timeout;
- receipt/invoice proof upload;
- final material subtotal;
- delivery fee;
- customer confirmation;
- dispute freeze/resolution.

### Finance

Ledger real boshlandi, lekin TZ bo'yicha keyin yana qo'shiladi:

- append-only adjustment/reversal;
- dealer earning alohida holatlari;
- payout;
- payment allocation;
- commission rule versioning;
- debt aging.

### Admin/security/test

Admin panel hozir boshlang'ich. TZ bo'yicha keyin:

- admin approval flows;
- dispute management;
- filters/search/export;
- audit viewer;
- rate limit;
- OpenAPI;
- unit/integration/E2E testlar;
- Telegram notification outbox;

qo'shiladi.

## Qaror: keyingi etap

External Telegram token hali kerak bo'lmagan eng foydali keyingi qadam:

> Dealer/usta modulini real qilish.

Bu `DLR-001..020`, `CUS-001`, `DLR-005`, `AC-001` talablariga poydevor yaratadi va finance ledgerdagi dealer rewardni keyingi bosqichda real dealer bilan bog'lashga tayyorlaydi.
