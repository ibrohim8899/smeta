# 06 - Mijoz tanlovi va buyurtma

Bu etap mijoz bitta taklifni tanlashini va undan buyurtma yaratilishini boshlaydi.

## Backend

Yangi endpointlar:

- `POST /material-requests/:requestId/select-offer/:offerId`
- `GET /material-requests/:requestId/order`
- `GET /orders`
- `PATCH /orders/:orderId/status`

Tanlash qoidasi:

- so'rov uchun faqat bitta buyurtma yaratiladi.
- tanlangan taklif `selected` statusga o'tadi.
- boshqa takliflar `not_selected` bo'ladi.
- material so'rovi `selected` statusga o'tadi.
- buyurtma `pending_store_acceptance` statusda ochiladi.

## Frontend

Yangi viewlar:

- `Mijoz tanlovi`
- `Buyurtmalar`

Mijoz tanlovi viewi so'rov bo'yicha takliflarni ko'rsatadi, mijoz bittasini tanlaydi va buyurtma holatini ko'radi.
Buyurtmalar viewi order fulfillment statuslarini real API orqali yangilaydi.

## Keyingi qadam

Keyingi etap moliya:

- buyurtma yakunlangandan keyin komissiya snapshot ochiladi;
- do'kon qarzi, usta mukofoti va platforma sof foydasi hisoblanadi;
- to'lov kiritish va moliya jurnali holatlari real bo'ladi.
