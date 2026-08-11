# 05 - Do'kon va taklif moduli

Bu etap do'konlar va taklif oqimini boshlaydi.

## Backend

Yangi endpointlar:

- `GET /stores` - do'konlar ro'yxati.
- `POST /stores` - yangi do'kon yaratish.
- `POST /material-requests/:requestId/assign-stores` - so'rovni mos do'konlarga yuborish.
- `GET /material-requests/:requestId/recipients` - so'rov qaysi do'konlarga yuborilganini ko'rish.
- `POST /material-requests/:requestId/offers` - do'kon taklif beradi.
- `GET /material-requests/:requestId/offers` - so'rov bo'yicha takliflar.

Default do'konlar seed qilinadi:

- Namangan Qurilish
- Mega Stroy
- Chust Market

## Frontend

- Admin navbatidagi `Do'konlarga yuborish` endi so'rovni real do'konlarga biriktiradi.
- Do'kon takliflari ekrani real `GET /stores` va `GET /offers` bilan ishlaydi.
- Do'kon taklifi formasi real `POST /offers` qiladi.

## Keyingi cheklovlar

Hozir taklif yaratish admin/dev flow uchun ochiq. Keyingi auth etapidan keyin:

- faqat biriktirilgan do'kon o'z so'roviga taklif bera oladi;
- har do'kon/so'rov uchun bitta aktiv taklif qoidasi qat'iy enforce qilinadi;
- mijoz faqat takliflarni solishtirish va bittasini tanlash huquqiga ega bo'ladi.
