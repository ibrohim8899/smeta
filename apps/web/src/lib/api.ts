const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const API_ROLE_HEADER = import.meta.env.VITE_SMETA_ROLE;
const SESSION_STORAGE_KEY = "smeta-session-token";
const SESSION_CLEARED_EVENT = "smeta-session-cleared";

function authHeaders(headers?: Record<string, string>) {
  const sessionToken = getStoredSessionToken();

  return {
    ...(API_ROLE_HEADER
      ? {
          "x-smeta-role": API_ROLE_HEADER
        }
      : {}),
    ...(sessionToken
      ? {
          "x-smeta-session": sessionToken
        }
      : {}),
    ...headers
  };
}

function jsonHeaders() {
  return authHeaders({
    "Content-Type": "application/json"
  });
}

async function parseJsonOrNull<T>(response: Response): Promise<T | null> {
  const body = await response.text();
  return body.trim() ? (JSON.parse(body) as T) : null;
}

async function readApiErrorMessage(response: Response, fallback: string) {
  const body = await response.text();

  if (!body.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: unknown };
    const message = Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  } catch {
    return body;
  }
}

async function readSessionAwareApiError(response: Response, fallback: string) {
  const message = await readApiErrorMessage(response, fallback);

  if (response.status === 401) {
    clearSessionToken();

    if (message.includes("Sessiya muddati tugagan")) {
      return "Sessiya muddati tugagan. Iltimos, Telegram orqali qayta kiring.";
    }

    if (message.includes("Sessiya topilmadi")) {
      return "Sessiya topilmadi. Iltimos, Telegram orqali qayta kiring.";
    }
  }

  return message;
}

export function getStoredSessionToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

export function storeSessionToken(token: string) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, token);
}

export function clearSessionToken() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
}

export function sessionClearedEventName() {
  return SESSION_CLEARED_EVENT;
}

export type AuthSessionResponse = {
  accountStatus: string;
  approvedRoles: string[];
  displayName: string;
  permissions: string[];
  role: string;
  roleLabel: string;
  source: string;
  userId: string | null;
};

export type TelegramExchangeResponse = {
  accessToken: string;
  expiresAt: string;
  session: AuthSessionResponse;
};

export type SwitchRoleResponse = TelegramExchangeResponse;

export type BrowserLoginResponse = {
  appLink?: string;
  deepLink: string;
  expiresAt: string;
  nonce: string;
  qrPayload: string;
  returnUrl?: string;
  status: string;
};

export type BrowserLoginPollResponse =
  | {
      status: "pending" | "expired" | "canceled" | "consumed";
    }
  | {
      accessToken: string;
      expiresAt: string;
      session: AuthSessionResponse;
      status: "authenticated";
    };

export type PermissionMatrixResponse = Array<{
  permissions: string[];
  role: string;
  roleLabel: string;
}>;

export type UserResponse = {
  active: boolean;
  createdAt: string;
  displayName: string;
  email: string | null;
  id: string;
  lastLoginAt: string | null;
  role: string;
  roles: string[];
  status: string;
  telegramLinked: boolean;
  telegramUserId: string | null;
  telegramUsername: string | null;
  updatedAt: string;
};

export type AuditLogResponse = {
  action: string;
  actorId: string | null;
  actorRole: string | null;
  createdAt: string;
  entityId: string | null;
  entityType: string;
  id: string;
  metadata: Record<string, unknown> | null;
  reason: string | null;
};

export type NotificationResponse = {
  attempts: number;
  bodyUz: string;
  channel: string;
  createdAt: string;
  eventType: string;
  id: string;
  lastError: string | null;
  metadata: Record<string, unknown> | null;
  recipientRef: string | null;
  recipientRole: string;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  titleUz: string;
  updatedAt: string;
};

export type CreateMaterialRequestPayload = {
  attachments: Array<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  category: string;
  customerName: string;
  dealerReferral?: string;
  dealerReferralCode?: string;
  description?: string;
  deliveryNote?: string;
  phone?: string;
  region: string;
  source: "guest_link" | "telegram_mini_app" | "dealer_assisted";
};

export type MaterialRequestResponse = {
  adminNote: string | null;
  attachments: Array<{
    fileName: string;
    id: string;
    mimeType: string;
    scanStatus: string;
    sizeBytes: number;
    storageKey: string | null;
  }>;
  category: string;
  createdAt: string;
  customerName: string;
  dealer: {
    displayName: string;
    id: string;
    referralCode: string;
    status: string;
  } | null;
  dealerReferral: string | null;
  dealerReferralCode: string | null;
  description: string | null;
  deliveryNote: string | null;
  id: string;
  guestAccessToken?: string;
  guestAccessUrl?: string;
  phone: string | null;
  publicCode: string;
  region: string;
  source: string;
  status: string;
};

export type GuestMaterialRequestResponse = Omit<MaterialRequestResponse, "adminNote" | "attachments" | "phone"> & {
  attachments: Array<{
    fileName: string;
    id: string;
    mimeType: string;
    scanStatus: string;
    sizeBytes: number;
  }>;
  guestTokenExpiresAt: string;
  phone: string | null;
  phoneRequiredBeforeSelection: boolean;
};

export type DealerResponse = {
  adminNote: string | null;
  companyName: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  phone: string | null;
  referralActive: boolean;
  referralCode: string;
  referralLink: string;
  qrPayload: string;
  region: string;
  telegramShareUrl: string;
  status: string;
  updatedAt: string;
};

export type DealerPublicReferralResponse = {
  companyName: string | null;
  displayName: string;
  id: string;
  referralCode: string;
  referralLink: string;
  region: string;
  status: string;
};

export type DealerReferralToolsResponse = {
  qrPayload: string;
  referralCode: string;
  referralLink: string;
  shareText: string;
  telegramShareUrl: string;
};

export type DealerRequestResponse = {
  businessStatus: string;
  category: string;
  createdAt: string;
  customerDisplay: string;
  id: string;
  publicCode: string;
  region: string;
  source: string;
  status: string;
};

export type DealerSummaryResponse = {
  approvedEarningsUzs: number;
  completedCount: number;
  conversionRate: number;
  paidEarningsUzs: number;
  payableEarningsUzs: number;
  pendingEarningsUzs: number;
  referredRequestCount: number;
  selectedCount: number;
};

export type StoreResponse = {
  active: boolean;
  address: string | null;
  adminNote: string | null;
  categories: string[];
  commissionRate: number;
  createdAt: string;
  id: string;
  name: string;
  ownerName: string | null;
  phone: string | null;
  serviceRegions: string[];
  status: string;
  updatedAt: string;
  verifiedAt: string | null;
};

export type StoreOfferResponse = {
  completeListAvailable: boolean;
  createdAt: string;
  deliveryEstimate: string | null;
  deliveryFeeUzs: number;
  deliveryIncluded: boolean;
  finalTotalUzs: number;
  id: string;
  materialSubtotalUzs: number;
  note: string | null;
  status: string;
  store: StoreResponse;
  totalAmountUzs: number;
  validityHours: number;
};

export type GuestStoreOfferResponse = Omit<StoreOfferResponse, "store"> & {
  store: {
    id: string;
    name: string;
  };
};

export type StoreInboxItemResponse = {
  assignedAt: string;
  attachments: Array<{
    fileName: string;
    id: string;
    mimeType: string;
    scanStatus: string;
    sizeBytes: number;
  }>;
  category: string;
  createdAt: string;
  customerDisplay: string;
  dealer: {
    displayName: string;
    id: string;
    referralCode: string;
  } | null;
  description: string | null;
  offer: Omit<StoreOfferResponse, "store"> & {
    updatedAt: string;
  } | null;
  publicCode: string;
  recipientId: string;
  recipientStatus: string;
  region: string;
  requestId: string;
  requestStatus: string;
};

export type OrderResponse = {
  acceptedAmountUzs: number;
  confirmedAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
  deliveryProofFileName: string | null;
  deliveryProofNote: string | null;
  finalAmountUzs: number;
  id: string;
  publicCode: string;
  request: {
    id: string;
    publicCode: string;
    status: string;
  };
  selectedOffer: {
    deliveryFeeUzs: number;
    finalTotalUzs: number;
    id: string;
    materialSubtotalUzs: number;
    totalAmountUzs: number;
  };
  status: string;
  statusNote: string | null;
  store: {
    id: string;
    name: string;
  };
};

export type FinanceLedgerResponse = {
  adjustments: Array<{
    amountUzs: number;
    createdAt: string;
    id: string;
    proofFileName: string | null;
    reason: string | null;
    type: string;
  }>;
  agingBucket: "current" | "overdue_1_7" | "overdue_8_30" | "overdue_31_plus" | "paid";
  baseAmountUzs: number;
  createdAt: string;
  dealerId: string | null;
  dealerReferral: string | null;
  dealerRewardRateBps: number;
  dealerRewardUzs: number;
  id: string;
  order: {
    id: string;
    publicCode: string;
    requestPublicCode: string;
    status: string;
  };
  paidAmountUzs: number;
  paymentNote: string | null;
  payments: Array<{
    amountUzs: number;
    createdAt: string;
    id: string;
    method: string | null;
    note: string | null;
    proofFileName: string | null;
    reference: string | null;
  }>;
  platformCommissionUzs: number;
  platformNetUzs: number;
  publicCode: string;
  remainingDebtUzs: number;
  status: string;
  dueAt: string | null;
  store: {
    id: string;
    name: string;
  };
  storeCommissionRateBps: number;
  storeDebtUzs: number;
  updatedAt: string;
};

export type FinanceSummaryResponse = {
  agingBuckets: Record<"current" | "overdue_1_7" | "overdue_8_30" | "overdue_31_plus" | "paid", number>;
  baseAmountUzs: number;
  dealerPayableUzs: number;
  dealerRewardUzs: number;
  ledgerCount: number;
  overdueDebtUzs: number;
  paidAmountUzs: number;
  paidCount: number;
  payableCount: number;
  platformCommissionUzs: number;
  platformNetUzs: number;
  remainingDebtUzs: number;
  storeDebtUzs: number;
};

export type FinancePayoutResponse = {
  amountUzs: number;
  createdAt: string;
  dealerId: string;
  dealerName: string | null;
  id: string;
  method: string | null;
  note: string | null;
  paidAt: string | null;
  proofFileName: string | null;
  publicCode: string;
  reference: string | null;
  status: string;
  updatedAt: string;
};

export type DealerStatementResponse = {
  dealerId: string;
  generatedAt: string;
  grossRewardUzs: number;
  paidPayoutUzs: number;
  payableUzs: number;
  pendingPayoutUzs: number;
  remainingPayableUzs: number;
  payouts: FinancePayoutResponse[];
  rows: FinanceLedgerResponse[];
};

export type StoreStatementResponse = {
  generatedAt: string;
  overdueDebtUzs: number;
  paidAmountUzs: number;
  remainingDebtUzs: number;
  rows: FinanceLedgerResponse[];
  storeDebtUzs: number;
};

export type V1ReportSummaryResponse = {
  counts: Record<string, number>;
  dealerStatusCounts: Record<string, number>;
  disputeQueue: Array<{
    adminNote: string | null;
    createdAt: string;
    entity: string;
    id: string;
    publicCode: string;
    status: string;
  }>;
  financeTotals: {
    dealerRewardUzs: number;
    paidAmountUzs: number;
    platformCommissionUzs: number;
    platformNetUzs: number;
    remainingDebtUzs: number;
    storeDebtUzs: number;
  };
  generatedAt: string;
  offerStatusCounts: Record<string, number>;
  orderStatusCounts: Record<string, number>;
  requestStatusCounts: Record<string, number>;
  storeStatusCounts: Record<string, number>;
};

export type V1SettingsResponse = {
  categories: string[];
  currency: string;
  dealerRewardRate: number;
  debtDueDays: number;
  regions: string[];
  requestDeadlineSeconds: number;
  storeAcceptanceTimeoutSeconds: number;
  storeCommissionRate: number;
  timezone: string;
};

export async function createMaterialRequest(payload: CreateMaterialRequestPayload): Promise<MaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "So'rov yuborishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export async function fetchAuthSession(role?: string): Promise<AuthSessionResponse> {
  const headers = role ? authHeaders({ "x-smeta-role": role }) : authHeaders();
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers
  });

  if (!response.ok) {
    const message = await readApiErrorMessage(response, "Rol ma'lumotini olishda xatolik bo'ldi");

    if (response.status === 401 && message.includes("Sessiya topilmadi") && getStoredSessionToken()) {
      clearSessionToken();
      return fetchAuthSession(role);
    }

    throw new Error(message || "Rol ma'lumotini olishda xatolik bo'ldi");
  }

  return response.json() as Promise<AuthSessionResponse>;
}

export async function fetchPermissionMatrix(): Promise<PermissionMatrixResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/permissions`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Ruxsatlar ro'yxatini olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<PermissionMatrixResponse>;
}

export async function fetchUsers(): Promise<UserResponse[]> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Foydalanuvchilarni yuklab bo'lmadi"));
  }

  return response.json() as Promise<UserResponse[]>;
}

export async function updateUserAccess(
  userId: string,
  payload: {
    active?: boolean;
    roles?: string[];
    status?: string;
  }
): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/access`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Foydalanuvchi rollari yangilanmadi"));
  }

  return response.json() as Promise<UserResponse>;
}

export async function exchangeTelegramInitData(payload: {
  initData: string;
  requestedRole?: string;
}): Promise<TelegramExchangeResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/telegram/exchange`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Telegram sessiyasini yaratishda xatolik bo'ldi"));
  }

  return response.json() as Promise<TelegramExchangeResponse>;
}

export async function createBrowserLogin(requestedRole?: string): Promise<BrowserLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/browser-login`, {
    body: JSON.stringify({
      requestedRole
    }),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    const message = await readApiErrorMessage(response, "Telegram login yaratishda xatolik bo'ldi");
    throw new Error(message || "Telegram login yaratishda xatolik bo'ldi");
  }

  return response.json() as Promise<BrowserLoginResponse>;
}

export async function pollBrowserLogin(nonce: string): Promise<BrowserLoginPollResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/browser-login/${encodeURIComponent(nonce)}`);

  if (!response.ok) {
    const message = await readApiErrorMessage(response, "Telegram login holatini olishda xatolik bo'ldi");
    throw new Error(message || "Telegram login holatini olishda xatolik bo'ldi");
  }

  return response.json() as Promise<BrowserLoginPollResponse>;
}

export async function cancelBrowserLogin(nonce: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/browser-login/${encodeURIComponent(nonce)}/cancel`, {
    method: "POST"
  });

  if (!response.ok) {
    const message = await readApiErrorMessage(response, "Telegram loginni bekor qilishda xatolik bo'ldi");
    throw new Error(message || "Telegram loginni bekor qilishda xatolik bo'ldi");
  }

  return response.json() as Promise<{ status: string }>;
}

export async function logoutCurrentSession(): Promise<{ revoked: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Sessiyadan chiqishda xatolik bo'ldi"));
  }

  clearSessionToken();
  return response.json() as Promise<{ revoked: boolean }>;
}

export async function switchAuthRole(role: string): Promise<SwitchRoleResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/switch-role`, {
    body: JSON.stringify({
      role
    }),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Rolni almashtirishda xatolik bo'ldi"));
  }

  return response.json() as Promise<SwitchRoleResponse>;
}

export async function fetchAuditLogs(
  limit = 80,
  filters?: {
    action?: string;
    actorRole?: string;
    entityType?: string;
  }
): Promise<AuditLogResponse[]> {
  const params = new URLSearchParams({
    limit: String(limit)
  });

  if (filters?.action) {
    params.set("action", filters.action);
  }

  if (filters?.actorRole) {
    params.set("actorRole", filters.actorRole);
  }

  if (filters?.entityType) {
    params.set("entityType", filters.entityType);
  }

  const response = await fetch(`${API_BASE_URL}/audit?${params.toString()}`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Audit tarixini olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<AuditLogResponse[]>;
}

export async function fetchV1ReportSummary(): Promise<V1ReportSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/reports/v1-summary`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Hisobotni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<V1ReportSummaryResponse>;
}

export async function fetchV1Settings(): Promise<V1SettingsResponse> {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Settings olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<V1SettingsResponse>;
}

export async function updateV1Settings(payload: Partial<V1SettingsResponse>): Promise<V1SettingsResponse> {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Settings saqlashda xatolik bo'ldi"));
  }

  return response.json() as Promise<V1SettingsResponse>;
}

export async function resolveMaterialRequestDispute(
  requestId: string,
  payload: {
    outcome: "cancel" | "reopen";
    reason: string;
  }
): Promise<MaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/resolve-dispute`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Request nizosini yopishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export async function resolveOrderDispute(
  orderId: string,
  payload: {
    finalAmountUzs?: number;
    outcome: "complete" | "cancel" | "reopen";
    reason: string;
  }
): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/resolve-dispute`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Order nizosini yopishda xatolik bo'ldi"));
  }

  return response.json() as Promise<OrderResponse>;
}

export function getV1ReportCsvUrl() {
  return `${API_BASE_URL}/reports/v1-summary.csv`;
}

export async function downloadV1ReportCsv(): Promise<string> {
  const response = await fetch(getV1ReportCsvUrl(), {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "CSV hisobotni olishda xatolik bo'ldi"));
  }

  return response.text();
}

export async function fetchNotifications(limit = 100, status?: string): Promise<NotificationResponse[]> {
  const params = new URLSearchParams({
    limit: String(limit)
  });

  if (status) {
    params.set("status", status);
  }

  const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await readSessionAwareApiError(response, "Bildirishnomalarni olishda xatolik bo'ldi");
    throw new Error(message || "Bildirishnomalarni olishda xatolik bo'ldi");
  }

  return response.json() as Promise<NotificationResponse[]>;
}

export async function createNotification(payload: {
  bodyUz: string;
  channel?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  recipientRef?: string;
  recipientRole: string;
  scheduledAt?: string;
  titleUz: string;
}): Promise<NotificationResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    const message = await readSessionAwareApiError(response, "Bildirishnoma yaratishda xatolik bo'ldi");
    throw new Error(message || "Bildirishnoma yaratishda xatolik bo'ldi");
  }

  return response.json() as Promise<NotificationResponse>;
}

export async function fetchDueNotifications(limit = 50, channel?: string): Promise<NotificationResponse[]> {
  const params = new URLSearchParams({
    limit: String(limit)
  });

  if (channel) {
    params.set("channel", channel);
  }

  const response = await fetch(`${API_BASE_URL}/notifications/due?${params.toString()}`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await readSessionAwareApiError(response, "Due bildirishnomalarni olishda xatolik bo'ldi");
    throw new Error(message || "Due bildirishnomalarni olishda xatolik bo'ldi");
  }

  return response.json() as Promise<NotificationResponse[]>;
}

export async function updateNotificationStatus(id: string, status: string, error?: string): Promise<NotificationResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications/${id}/status`, {
    body: JSON.stringify({
      error,
      status
    }),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    const message = await readSessionAwareApiError(response, "Bildirishnoma statusini o'zgartirishda xatolik bo'ldi");
    throw new Error(message || "Bildirishnoma statusini o'zgartirishda xatolik bo'ldi");
  }

  return response.json() as Promise<NotificationResponse>;
}

export async function retryNotification(id: string): Promise<NotificationResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications/${id}/retry`, {
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    const message = await readSessionAwareApiError(response, "Bildirishnomani retry qilishda xatolik bo'ldi");
    throw new Error(message || "Bildirishnomani retry qilishda xatolik bo'ldi");
  }

  return response.json() as Promise<NotificationResponse>;
}

export async function createMaterialRequestWithFiles(
  payload: Omit<CreateMaterialRequestPayload, "attachments">,
  files: File[]
): Promise<MaterialRequestResponse> {
  const formData = new FormData();

  formData.append("category", payload.category);
  formData.append("customerName", payload.customerName);
  formData.append("region", payload.region);
  formData.append("source", payload.source);

  if (payload.dealerReferral) {
    formData.append("dealerReferral", payload.dealerReferral);
  }

  if (payload.dealerReferralCode) {
    formData.append("dealerReferralCode", payload.dealerReferralCode);
  }

  if (payload.description) {
    formData.append("description", payload.description);
  }

  if (payload.phone) {
    formData.append("phone", payload.phone);
  }

  files.forEach((file) => formData.append("attachments", file));

  const response = await fetch(`${API_BASE_URL}/material-requests/with-files`, {
    body: formData,
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "So'rov yuborishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export async function fetchMaterialRequests(): Promise<MaterialRequestResponse[]> {
  const response = await fetch(`${API_BASE_URL}/material-requests`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "So'rovlarni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse[]>;
}

export async function updateMaterialRequestStatus(id: string, status: string, note?: string): Promise<MaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${id}/status`, {
    body: JSON.stringify({
      note,
      status
    }),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Holatni o'zgartirishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export function getAttachmentDownloadUrl(requestId: string, attachmentId: string) {
  return `${API_BASE_URL}/material-requests/${requestId}/attachments/${attachmentId}/download`;
}

export function getGuestAttachmentDownloadUrl(token: string, attachmentId: string) {
  return `${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/attachments/${attachmentId}/download`;
}

export async function fetchGuestMaterialRequest(token: string): Promise<GuestMaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}`);

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Guest so'rovni ochishda xatolik bo'ldi"));
  }

  return response.json() as Promise<GuestMaterialRequestResponse>;
}

export async function updateGuestContact(
  token: string,
  payload: {
    deliveryNote?: string;
    phone: string;
  }
): Promise<GuestMaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/contact`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Kontaktni saqlashda xatolik bo'ldi"));
  }

  return response.json() as Promise<GuestMaterialRequestResponse>;
}

export async function fetchGuestOffers(token: string): Promise<GuestStoreOfferResponse[]> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/offers`);

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Takliflarni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<GuestStoreOfferResponse[]>;
}

export async function selectGuestOffer(token: string, offerId: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/select-offer/${offerId}`, {
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Taklif tanlashda xatolik bo'ldi"));
  }

  return response.json() as Promise<OrderResponse>;
}

export async function fetchGuestOrder(token: string): Promise<OrderResponse | null> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/order`);

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Buyurtmani olishda xatolik bo'ldi"));
  }

  return parseJsonOrNull<OrderResponse>(response);
}

export async function cancelGuestRequest(token: string, reason?: string): Promise<MaterialRequestResponse | OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/cancel`, {
    body: JSON.stringify({
      reason
    }),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Bekor qilishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse | OrderResponse>;
}

export async function disputeGuestRequest(token: string, reason: string): Promise<MaterialRequestResponse | OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/dispute`, {
    body: JSON.stringify({
      reason
    }),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Nizo ochishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse | OrderResponse>;
}

export async function confirmGuestOrderDelivery(
  token: string,
  orderId: string,
  payload: {
    finalAmountUzs?: number;
    note?: string;
  }
): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/orders/${orderId}/confirm-delivery`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Yetkazishni tasdiqlashda xatolik bo'ldi"));
  }

  return response.json() as Promise<OrderResponse>;
}

export async function rotateGuestMaterialRequestToken(token: string): Promise<{
  guestAccessToken: string;
  guestAccessUrl: string;
}> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/rotate`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Guest linkni yangilashda xatolik bo'ldi"));
  }

  return response.json() as Promise<{
    guestAccessToken: string;
    guestAccessUrl: string;
  }>;
}

export async function revokeGuestMaterialRequestToken(token: string): Promise<{ revoked: boolean }> {
  const response = await fetch(`${API_BASE_URL}/material-requests/guest/${encodeURIComponent(token)}/revoke`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Guest linkni bekor qilishda xatolik bo'ldi"));
  }

  return response.json() as Promise<{ revoked: boolean }>;
}

export async function cancelMaterialRequest(id: string): Promise<MaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${id}`, {
    headers: authHeaders(),
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "So'rovni bekor qilishda xatolik bo'ldi"));
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export async function fetchStores(): Promise<StoreResponse[]> {
  const response = await fetch(`${API_BASE_URL}/stores`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Do'konlarni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreResponse[]>;
}

export async function createStoreApplication(payload: {
  address?: string;
  categories: string[];
  name: string;
  ownerName?: string;
  phone?: string;
  serviceRegions: string[];
}): Promise<StoreResponse> {
  const response = await fetch(`${API_BASE_URL}/stores/apply`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Do'kon arizasini yuborishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreResponse>;
}

export async function updateStoreStatus(
  storeId: string,
  payload: {
    active?: boolean;
    adminNote?: string;
    status: string;
  }
): Promise<StoreResponse> {
  const response = await fetch(`${API_BASE_URL}/stores/${storeId}/status`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Do'kon statusini o'zgartirishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreResponse>;
}

export async function updateStoreProfile(
  storeId: string,
  payload: {
    address?: string;
    categories?: string[];
    name?: string;
    ownerName?: string;
    phone?: string;
    serviceRegions?: string[];
  }
): Promise<StoreResponse> {
  const response = await fetch(`${API_BASE_URL}/stores/${storeId}/profile`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Do'kon profilini o'zgartirishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreResponse>;
}

export async function fetchStoreInbox(storeId: string): Promise<StoreInboxItemResponse[]> {
  const response = await fetch(`${API_BASE_URL}/stores/${storeId}/inbox`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Do'kon inboxini olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreInboxItemResponse[]>;
}

export async function assignStoresToRequest(requestId: string, storeIds?: string[]) {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/assign-stores`, {
    body: JSON.stringify({
      storeIds
    }),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Do'konlarga yuborishda xatolik bo'ldi"));
  }

  return response.json() as Promise<unknown>;
}

export async function fetchStoreOffers(requestId: string): Promise<StoreOfferResponse[]> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/offers`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Takliflarni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreOfferResponse[]>;
}

export async function fetchOwnStoreOffers(requestId: string, storeId: string): Promise<StoreOfferResponse[]> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/offers?storeId=${encodeURIComponent(storeId)}`, {
    headers: {
      ...authHeaders(),
      "x-smeta-role": "store"
    }
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Do'kon taklifini olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreOfferResponse[]>;
}

export async function createStoreOffer(
  requestId: string,
  payload: {
    completeListAvailable?: boolean;
    deliveryEstimate?: string;
    deliveryFeeUzs?: number;
    deliveryIncluded?: boolean;
    materialSubtotalUzs?: number;
    note?: string;
    storeId: string;
    totalAmountUzs?: number;
    validityHours?: number;
  }
): Promise<StoreOfferResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/offers`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Taklif yaratishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreOfferResponse>;
}

export async function declineStoreRequest(requestId: string, storeId: string, reason?: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/stores/${storeId}/decline`, {
    body: JSON.stringify({
      reason
    }),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "So'rovni rad etishda xatolik bo'ldi"));
  }

  return response.json() as Promise<unknown>;
}

export async function withdrawStoreOffer(requestId: string, offerId: string, reason?: string): Promise<StoreOfferResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/offers/${offerId}/withdraw`, {
    body: JSON.stringify({
      reason
    }),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Taklifni qaytarishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreOfferResponse>;
}

export async function selectOffer(requestId: string, offerId: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/select-offer/${offerId}`, {
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Taklif tanlashda xatolik bo'ldi"));
  }

  return response.json() as Promise<OrderResponse>;
}

export async function fetchOrderByRequest(requestId: string): Promise<OrderResponse | null> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/order`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Buyurtmani olishda xatolik bo'ldi"));
  }

  return parseJsonOrNull<OrderResponse>(response);
}

export async function fetchOrders(): Promise<OrderResponse[]> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Buyurtmalarni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<OrderResponse[]>;
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string,
  payload?: {
    finalAmountUzs?: number;
    proofFileName?: string;
    proofNote?: string;
  }
): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
    body: JSON.stringify({
      note,
      ...payload,
      status
    }),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Buyurtma holatini o'zgartirishda xatolik bo'ldi"));
  }

  return response.json() as Promise<OrderResponse>;
}

export async function confirmOrderDelivery(
  orderId: string,
  payload: {
    finalAmountUzs?: number;
    note?: string;
  }
): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/confirm-delivery`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Yetkazishni tasdiqlashda xatolik bo'ldi"));
  }

  return response.json() as Promise<OrderResponse>;
}

export async function fetchFinanceLedger(): Promise<FinanceLedgerResponse[]> {
  const response = await fetch(`${API_BASE_URL}/finance/ledger`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Moliya jurnalini olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<FinanceLedgerResponse[]>;
}

export async function fetchFinanceSummary(): Promise<FinanceSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/summary`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Moliya xulosasini olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<FinanceSummaryResponse>;
}

export async function recordFinancePayment(
  ledgerId: string,
  amountUzs: number,
  note?: string,
  payload?: {
    method?: string;
    proofFileName?: string;
    reference?: string;
  }
): Promise<FinanceLedgerResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/ledger/${ledgerId}/payment`, {
    body: JSON.stringify({
      amountUzs,
      ...payload,
      note
    }),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "To'lovni yozishda xatolik bo'ldi"));
  }

  return response.json() as Promise<FinanceLedgerResponse>;
}

export async function recordFinanceAdjustment(
  ledgerId: string,
  payload: {
    amountUzs: number;
    proofFileName?: string;
    reason: string;
    type: "adjustment" | "waiver" | "reversal";
  }
): Promise<FinanceLedgerResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/ledger/${ledgerId}/adjustment`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Adjustment yozishda xatolik bo'ldi"));
  }

  return response.json() as Promise<FinanceLedgerResponse>;
}

export async function fetchFinancePayouts(): Promise<FinancePayoutResponse[]> {
  const response = await fetch(`${API_BASE_URL}/finance/payouts`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Payoutlarni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<FinancePayoutResponse[]>;
}

export async function fetchDealerStatement(dealerId: string): Promise<DealerStatementResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/statements/dealer/${dealerId}`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Dealer statement olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<DealerStatementResponse>;
}

export async function fetchStoreStatement(storeId: string): Promise<StoreStatementResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/statements/store/${storeId}`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Store statement olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<StoreStatementResponse>;
}

export async function createFinancePayout(payload: {
  amountUzs: number;
  dealerId: string;
  method?: string;
  note?: string;
  proofFileName?: string;
  reference?: string;
}): Promise<FinancePayoutResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/payouts`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Payout yaratishda xatolik bo'ldi"));
  }

  return response.json() as Promise<FinancePayoutResponse>;
}

export async function updateFinancePayoutStatus(
  payoutId: string,
  payload: {
    note?: string;
    proofFileName?: string;
    reference?: string;
    status: "approved" | "paid" | "canceled";
  }
): Promise<FinancePayoutResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/payouts/${payoutId}/status`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Payout statusini o'zgartirishda xatolik bo'ldi"));
  }

  return response.json() as Promise<FinancePayoutResponse>;
}

export async function fetchDealers(): Promise<DealerResponse[]> {
  const response = await fetch(`${API_BASE_URL}/dealers`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Ustalarni olishda xatolik bo'ldi"));
  }

  return response.json() as Promise<DealerResponse[]>;
}

export async function fetchDealerByReferral(referralCode: string): Promise<DealerPublicReferralResponse> {
  const response = await fetch(`${API_BASE_URL}/dealers/referral/${encodeURIComponent(referralCode)}`);

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Referral kodi topilmadi"));
  }

  return response.json() as Promise<DealerPublicReferralResponse>;
}

export async function fetchDealerReferralTools(dealerId: string): Promise<DealerReferralToolsResponse> {
  const response = await fetch(`${API_BASE_URL}/dealers/${dealerId}/referral-tools`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Referral tools yuklanmadi"));
  }

  return response.json() as Promise<DealerReferralToolsResponse>;
}

export async function fetchDealerRequests(dealerId: string): Promise<DealerRequestResponse[]> {
  const response = await fetch(`${API_BASE_URL}/dealers/${dealerId}/requests`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Usta requestlari yuklanmadi"));
  }

  return response.json() as Promise<DealerRequestResponse[]>;
}

export async function fetchDealerSummary(dealerId: string): Promise<DealerSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/dealers/${dealerId}/summary`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Usta summary yuklanmadi"));
  }

  return response.json() as Promise<DealerSummaryResponse>;
}

export async function createDealer(payload: {
  companyName?: string;
  displayName: string;
  phone?: string;
  region: string;
}): Promise<DealerResponse> {
  const response = await fetch(`${API_BASE_URL}/dealers`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Usta arizasini yaratishda xatolik bo'ldi"));
  }

  return response.json() as Promise<DealerResponse>;
}

export async function updateDealerStatus(
  dealerId: string,
  payload: {
    adminNote?: string;
    referralActive?: boolean;
    status: string;
  }
): Promise<DealerResponse> {
  const response = await fetch(`${API_BASE_URL}/dealers/${dealerId}/status`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Usta statusini o'zgartirishda xatolik bo'ldi"));
  }

  return response.json() as Promise<DealerResponse>;
}

export async function rotateDealerReferral(dealerId: string): Promise<DealerResponse> {
  const response = await fetch(`${API_BASE_URL}/dealers/${dealerId}/referral/rotate`, {
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readSessionAwareApiError(response, "Referral kodini yangilashda xatolik bo'ldi"));
  }

  return response.json() as Promise<DealerResponse>;
}
