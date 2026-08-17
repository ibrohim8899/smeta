export const APP_TIMEZONE = "Asia/Tashkent";
export const APP_CURRENCY = "UZS";
export const DEFAULT_STORE_COMMISSION_RATE = 0.05;
export const DEFAULT_DEALER_REWARD_RATE = 0.02;

export const DEFAULT_REGIONS = [
  "Namangan sh.",
  "Chust",
  "Uychi",
  "Pop",
  "Chortoq",
  "Kosonsoy"
] as const;

export const MATERIAL_CATEGORIES = [
  "Qurilish materiallari",
  "Santexnika",
  "Elektrika",
  "Bo'yoq",
  "Yog'och",
  "Tom yopish materiallari"
] as const;

export type DefaultRegion = (typeof DEFAULT_REGIONS)[number];
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const USER_ROLES = [
  "customer",
  "dealer",
  "store",
  "admin",
  "finance",
  "superadmin"
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["pending", "active", "rejected", "suspended", "blocked", "archived"] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  customer: "Mijoz",
  dealer: "Usta / dealer",
  finance: "Moliya",
  store: "Do'kon",
  superadmin: "Superadmin"
};

export const PERMISSIONS = [
  "requests.create",
  "requests.read",
  "requests.moderate",
  "requests.assign_stores",
  "stores.read",
  "stores.manage",
  "offers.create",
  "offers.read",
  "offers.select",
  "orders.read",
  "orders.fulfill",
  "orders.confirm",
  "dealers.apply",
  "dealers.read",
  "dealers.moderate",
  "finance.read",
  "finance.record_payment",
  "reports.read",
  "audit.read",
  "notifications.read",
  "notifications.manage",
  "settings.manage"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "requests.read",
    "requests.moderate",
    "requests.assign_stores",
    "stores.read",
    "stores.manage",
    "offers.read",
    "orders.read",
    "dealers.read",
    "dealers.moderate",
    "reports.read",
    "audit.read",
    "notifications.read",
    "notifications.manage"
  ],
  customer: ["requests.create", "requests.read", "offers.read", "offers.select", "orders.read", "orders.confirm"],
  dealer: ["requests.create", "requests.read", "dealers.apply", "orders.read"],
  finance: ["orders.read", "finance.read", "finance.record_payment", "reports.read", "audit.read", "notifications.read"],
  store: ["requests.read", "stores.read", "offers.create", "offers.read", "orders.read", "orders.fulfill"],
  superadmin: [...PERMISSIONS]
};

export const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "correction_required",
  "published",
  "collecting_offers",
  "selection_open",
  "selected",
  "completed",
  "expired",
  "canceled",
  "disputed"
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending_store_acceptance",
  "accepted",
  "preparing",
  "ready",
  "dispatched",
  "delivered_pending_confirmation",
  "completed",
  "canceled",
  "disputed"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STAGE_ONE_CHECKLIST = [
  "Monorepo asosi",
  "NestJS API qobig'i",
  "React web qobig'i",
  "PostgreSQL sozlamasi",
  "Umumiy rollar va statuslar",
  "Sog'liq tekshirish endpointi"
] as const;
