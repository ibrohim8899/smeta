# 17-etap: Professional UI polish va Do'kon takliflari sahifasi

## Nima tuzatildi

- Dark/light mode uchun rang tokenlari professional kontrastga moslandi.
- `tailwind.config.ts` eski statik palitradan CSS-variable palitraga o'tkazildi.
- `smeta-card`, `smeta-panel`, `smeta-input`, `smeta-primary-button`, `smeta-table` kabi umumiy UI klasslar qo'shildi.
- `Do'kon takliflari` sahifasi qayta yig'ildi:
  - maxfiy taklif yig'ish headeri;
  - takliflar, faol do'konlar, eng yaxshi narx statistikasi;
  - chiroyli empty-state;
  - professional jadval konteyneri;
  - sticky taklif yaratish formasi;
  - yaxshilangan input/select/textarea/checkbox/button.
- `StatusPill` kontrasti va shakli yaxshilandi.
- App content kengligi `1680px` bilan chegaralandi, juda keng ekranlarda UI cho'zilib ketmasligi uchun.

## Tekshiruv

- `npm run typecheck` muvaffaqiyatli o'tdi.
- `npm run build` muvaffaqiyatli o'tdi.
- Frontend `http://localhost:5173` qayta ishga tushirildi.
- Browser orqali dark mode vizual tekshirildi:
  - `main` fon: dark token;
  - header: dark surface;
  - card: dark surface + oq text;
  - input: dark elevated + oq text.

## Keyingi UI ishlar

- Shu professional UI bazasini `Admin navbati`, `Mijoz tanlovi`, `Buyurtmalar`, `Moliya`, `Ustalar`, `Xavfsizlik`, `Bildirishnomalar` sahifalariga bosqichma-bosqich ko'chirish.
- Light mode uchun ham screenshot asosida mayda spacing va typographic polish qilish.
- Asosiy CRUD/action flowlarni UI orqali e2e tekshirish.
