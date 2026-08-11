# 07 - Buyurtma bajarilishi

Bu etapda tanlangan taklifdan keyingi real buyurtma bajarilish oqimi qo'shildi.

## Backend

Kengaytirilgan endpoint:

- `PATCH /orders/:orderId/status` - buyurtma holatini yangilaydi va izoh saqlaydi.

Qo'llab-quvvatlanadigan buyurtma holatlari:

- `pending_store_acceptance` - do'kon qabul qilishini kutmoqda
- `accepted` - do'kon qabul qildi
- `preparing` - tayyorlanmoqda
- `ready` - tayyor
- `dispatched` - jo'natildi
- `delivered_pending_confirmation` - mijoz tasdiqlashi kutilmoqda
- `completed` - yakunlangan
- `canceled` - bekor qilingan
- `disputed` - nizo ochilgan

`completed`, `canceled` va `disputed` holatlarida bog'langan material so'rovining holati ham mos ravishda yangilanadi.

## Frontend

Yangi sahifa:

- `Buyurtmalar`

Bu sahifada:

- real buyurtmalar ro'yxati ko'rinadi;
- tanlangan buyurtma bo'yicha so'rov, do'kon, summa va holat ko'rsatiladi;
- status tugmalari API orqali real ishlaydi;
- status izohi ham bazada saqlanadi.

## Tekshiruv

Quyidagi flow API orqali tekshirildi:

- yangi so'rov yaratish;
- mos do'konga biriktirish;
- do'kon taklifi yaratish;
- mijoz taklifni tanlashi;
- buyurtma statusini `preparing` holatiga o'tkazish.
