# 01 - Loyiha tayyorlash

Bu etapda loyiha ishlashi uchun kerak bo'lgan poydevor tayyorlandi.

## Nima yaratildi

- `apps/api` - NestJS backend. API, baza ulanishi va keyingi modullar shu yerda.
- `apps/web` - React frontend. Mijoz, admin, do'kon, usta va moliya ekranlari shu yerda ko'rinadi.
- `packages/shared` - umumiy rollar, statuslar, vaqt zonasi va valyuta konstantalari.
- `.env` - lokal sozlamalar. PostgreSQL paroli: `ibrohim`.
- `scripts/setup-local-postgres.sql` - lokal PostgreSQL foydalanuvchisini tayyorlash uchun SQL.

## Hozir nima ishlayapti

- Web ilova: `http://localhost:5173`
- API sog'liq tekshiruvi: `http://localhost:4000/health`
- PostgreSQL: `smeta_market` baza, `smeta` foydalanuvchi, `ibrohim` parol.

## Web ilova nimani ko'rsatadi

- Boshqaruv sahifasi
- Mijoz material so'rovi yuborish oqimi
- Admin tekshiruv navbati
- Do'kon takliflari jadvali
- Usta referral va daromad paneli
- Moliya komissiya jurnali

## Muhim izoh

Bu hali to'liq production tizim emas. Bu 1-etap poydevori va TZdagi asosiy ekranlarning birinchi ishchi ko'rinishi. Keyingi etaplarda auth, real baza entitylari, login, rollar va API CRUD to'ldiriladi.
