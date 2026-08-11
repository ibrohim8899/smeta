# 03 - Mijoz so'rovi oqimi

Bu etap mijoz material so'rovi oqimini boshlaydi.

## Frontend strukturasi

Frontend endi bitta `App.tsx` ichida emas.

- `src/app` - asosiy qobiq, menyu va sahifa almashtirish.
- `src/components/ui` - qayta ishlatiladigan UI komponentlar.
- `src/features/customer-request` - mijoz so'rovi ekrani.
- `src/features/admin-queue` - admin tekshiruv navbati.
- `src/features/store-offers` - do'kon takliflari ko'rinishi.
- `src/features/dealer` - usta paneli.
- `src/features/finance` - moliya jurnali.
- `src/data` - vaqtinchalik demo ma'lumotlar.
- `src/lib` - API klienti.
- `src/types` - frontend soha typelari.

## Backend

Yangi modul:

- `POST /material-requests` - mehmon/mijoz so'rov yaratadi.
- `GET /material-requests` - oxirgi so'rovlarni qaytaradi.
- `GET /material-requests/:id` - bitta so'rovni qaytaradi.
- `GET /settings/defaults` - hudud, kategoriya va default moliya foizlarini qaytaradi.

Default sozlamalar:

- superadmin email: `admin@smeta.uz`
- superadmin parol: `smeta123`
- do'kon komissiyasi: `5%`
- usta mukofoti: `2%`
- hududlar: Namangan sh., Chust, Uychi, Pop, Chortoq, Kosonsoy
- kategoriyalar: qurilish materiallari, santexnika, elektrika, bo'yoq, yog'och, tom yopish

Hozir faylning o'zi storage'ga yuklanmaydi, lekin attachment metama'lumoti saqlanadi:

- fayl nomi
- MIME turi
- hajmi

Keyingi kichik qadam: fayl yuklash storage'i va admin tekshiruv statuslarini real qilish.
