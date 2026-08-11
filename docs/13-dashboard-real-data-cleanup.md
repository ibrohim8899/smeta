# 13 - Dashboard real data cleanup

Bu kichik etapda frontenddagi eski demo ma'lumotlar olib tashlandi va dashboard real API ma'lumotlariga ulandi.

## O'zgarishlar

- `DashboardView` moliya kartalarini `GET /finance/summary` orqali ko'rsatadi.
- `Pul oqimi` ro'yxati `GET /finance/ledger` orqali real ledgerdan keladi.
- Eski `mockData.ts` fayli olib tashlandi.
- App start holati mock requestlardan emas, real `GET /material-requests` natijasidan boshlanadi.
- API bo'sh bo'lsa admin/store/selection sahifalarida o'zbekcha bo'sh holat ko'rsatiladi.
- Noto'g'ri kodlangan ajratgich belgilar tozalandi.

## Tekshiruv

Tekshirildi:

- `npm run typecheck`
- `npm run build`
- `GET /finance/summary`
- `GET /notifications?limit=2`
- web sahifa `http://localhost:5173` 200 qaytardi.

## Hali qolgan demo/xom joylar

- Ba'zi form default qiymatlari foydalanuvchiga tez test qilish uchun turibdi.
- Keyingi etaplarda ular real user/session/role oqimiga qarab moslanadi.
