const statusLabels: Record<string, string> = {
  accepted: "Qabul qilindi",
  active: "Faol",
  approved: "Tasdiqlangan",
  archived: "Arxivlangan",
  blocked: "Bloklangan",
  rejected: "Rad etilgan",
  metadata_only: "Faqat metadata",
  local_private: "Yopiq saqlash",
  pending_scan: "Skan kutilmoqda",
  suspended: "To'xtatilgan",
  canceled: "Bekor qilingan",
  collecting_offers: "Takliflar yig'ilyapti",
  completed: "Yakunlangan",
  correction_required: "Tuzatish kerak",
  dispatched: "Jo'natildi",
  disputed: "Nizo ochilgan",
  draft: "Qoralama",
  delivered_pending_confirmation: "Mijoz tasdiqlashi kerak",
  expired: "Muddati o'tgan",
  lowest: "Eng arzon",
  not_selected: "Tanlanmagan",
  open: "Ochiq",
  paid: "To'langan",
  payable: "To'lanadi",
  partial_paid: "Qisman to'langan",
  pending: "Kutilmoqda",
  not_started: "Boshlanmagan",
  authenticated: "Tasdiqlandi",
  consumed: "Ishlatilgan",
  pending_store_acceptance: "Do'kon qabul qilishini kutmoqda",
  preparing: "Tayyorlanmoqda",
  processing: "Jarayonda",
  published: "Do'konlarga yuborilgan",
  ready: "Tayyor",
  responded: "Javob berdi",
  selected: "Tanlangan",
  selection_open: "Tanlash ochiq",
  sent: "Yuborildi",
  submitted: "Yuborilgan",
  skipped: "O'tkazilgan",
  failed: "Xato",
  dead_letter: "Yuborib bo'lmadi",
  under_review: "Admin tekshiruvda"
};

const sourceLabels: Record<string, string> = {
  dealer_assisted: "Usta yordamida",
  guest_link: "Mehmon havolasi",
  telegram_mini_app: "Telegram Mini App"
};

export function formatStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  return statusLabels[normalized] ?? statusLabels[status] ?? status;
}

export function formatSourceLabel(source: string) {
  return sourceLabels[source] ?? source;
}

export function isStrongStatus(statusOrLabel: string) {
  const normalized = statusOrLabel.toLowerCase();
  const display = formatStatusLabel(statusOrLabel);

  return [
    "accepted",
    "active",
    "lowest",
    "open",
    "payable",
    "partial_paid",
    "approved",
    "ready",
    "selection_open",
    "selected",
    "Eng arzon",
    "Faol",
    "Ochiq",
    "Qabul qilindi",
    "Tanlangan",
    "Tasdiqlangan",
    "Tanlash ochiq",
    "Tayyor",
    "To'lanadi"
  ].includes(normalized) || [
    "Eng arzon",
    "Faol",
    "Ochiq",
    "Qabul qilindi",
    "Tanlangan",
    "Tanlash ochiq",
    "Tayyor",
    "To'lanadi"
  ].includes(display);
}
