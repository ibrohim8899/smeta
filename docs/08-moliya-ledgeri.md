# 08 - Moliya ledgeri

Bu etapda moliya qismi demo jadvaldan real backend ledgerga o'tkazildi.

## Backend

Yangi modul:

- `FinanceModule`
- `FinanceService`
- `FinanceController`
- `FinanceLedgerEntity`

Yangi endpointlar:

- `GET /finance/ledger` - barcha moliya yozuvlari.
- `GET /finance/summary` - umumiy moliya xulosasi.
- `POST /finance/orders/:orderId/snapshot` - yakunlangan buyurtma uchun ledger snapshot yaratish.
- `PATCH /finance/ledger/:ledgerId/payment` - do'kon to'lovini ledgerga yozish.

## Avtomatik hisob-kitob

Buyurtma `completed` holatiga o'tganda ledger avtomatik yaratiladi.

Formula:

- platforma komissiyasi = final material summasi × do'kon komissiya foizi
- usta reward = final material summasi × usta reward foizi
- platforma sof foydasi = platforma komissiyasi - usta reward
- do'kon qarzi = platforma komissiyasi

Default qiymatlar `.env`dan olinadi:

- `DEFAULT_STORE_COMMISSION_RATE=0.05`
- `DEFAULT_DEALER_REWARD_RATE=0.02`

## Frontend

`Moliya` sahifasi endi real API bilan ishlaydi:

- ledger yozuvlarini ko'rsatadi;
- do'kon qarzi, usta reward va platforma sof foydasini summary cardlarda chiqaradi;
- ledger bo'yicha qisman yoki to'liq to'lov yozadi;
- to'lovdan keyin status `partial_paid` yoki `paid` bo'ladi.

## Tekshiruv

API orqali quyidagilar tekshirildi:

- `ORD-00002` `completed` statusiga o'tkazildi.
- Avtomatik `FIN-00001` ledger yozuvi yaratildi.
- 12,345,000 UZS bazadan 617,250 UZS komissiya hisoblandi.
- 246,900 UZS usta reward hisoblandi.
- 370,350 UZS platforma sof foydasi hisoblandi.
- 100,000 UZS qisman to'lov yozildi.
- Qoldiq qarz 517,250 UZS bo'lib qoldi.
