# 16 - UI theme polish va dark/light mode

Bu etap foydalanuvchi fikridan keyin qo'shildi: UI hali funksional ko'rinishda edi, lekin mahsulot hissi kamroq edi. Shu sabab design tokenlar to'g'rilandi va dark/light mode poydevori qo'shildi.

## Asosiy muammo

Kodda quyidagi klasslar ishlatilgan edi:

- `bg-smeta-soft`
- `border-smeta-line`
- `text-smeta-mauve`

Lekin Tailwind config ichida `soft` va `line` kabi tokenlar to'liq aniqlanmagan edi. Natijada UI palitra niyatiga to'liq tushmayotgan edi.

## Qo'shilgan theme tokenlar

Tailwind ranglari CSS variables orqali ishlaydigan qilindi:

- `smeta-ink`
- `smeta-mauve`
- `smeta-rose`
- `smeta-blush`
- `smeta-clay`
- `smeta-paper`
- `smeta-soft`
- `smeta-line`
- `smeta-surface`
- `smeta-elevated`
- `smeta-deep`

`smeta-deep` doimiy qorong'i primary fon uchun qoldirildi. Bu dark mode'da oq matn kontrastini saqlaydi.

## Dark/light mode

Qo'shildi:

- `data-theme="light"`
- `data-theme="dark"`
- `localStorage` orqali theme eslab qolish;
- browser `prefers-color-scheme` bo'yicha default tanlash;
- headerda Moon/Sun toggle.

## UI polish

Yangilandi:

- sidebar kengligi va active nav ko'rinishi;
- sticky header;
- radial background gradient;
- cards uchun yumshoq shadow;
- umumiy `MetricCard`, `InfoTile`, `IconButton`, `TextField`, `SearchBox`, `RequestRow`;
- dashboard va customer request asosiy kartalari;
- dark mode'da eski `bg-white` joylari surface rangga fallback qiladi.

## Tekshiruv

Tekshirildi:

- `npm run typecheck`
- `npm run build`
- web `http://localhost:5173` 200

## Keyingi UI ishlari

- barcha feature sahifalarini bir xil card/table design systemga o'tkazish;
- mobile responsive polish;
- loading skeletonlar;
- empty state illustration/iconlar;
- status timeline component;
- pixel-perfect TZ/Figma layout bo'lsa shu asosga moslash.
