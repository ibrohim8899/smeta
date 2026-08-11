# 04 - Fayl yuklash va so'rov tekshiruvi

Bu etap mijoz so'rovi oqimini real fayl yuklash va admin tekshiruv amallari bilan kengaytiradi.

## Backend

Yangi va kengaytirilgan endpointlar:

- `POST /material-requests/with-files` - multipart forma orqali so'rov va fayllarni qabul qiladi.
- `PATCH /material-requests/:id/status` - admin so'rov holatini o'zgartiradi.
- `DELETE /material-requests/:id` - so'rovni hard delete qilmaydi, `canceled` statusga o'tkazadi.

Yuklash cheklovlari:

- 10 tagacha fayl
- har bir fayl 20MB gacha
- ruxsat etilgan turlar: JPEG, PNG, WebP, PDF, XLS, XLSX
- lokal storage: `storage/uploads/material-requests`

## Frontend

Mijoz so'rovi formasi endi faylni multipart upload bilan yuboradi.

Admin navbati amallari:

- `Tekshiruvga olish` -> `under_review`
- `Tuzatish so'rash` -> `correction_required`
- `Do'konlarga yuborish` -> `published`
- `Bekor qilish` -> `canceled`

## Izoh

Bu hali to'liq production upload xavfsizligi emas. Keyingi upload xavfsizligi qadamlari:

- fayl signature tekshirish
- malware scan hook
- yopiq download endpoint
- audit log
- admin comment tarixi
