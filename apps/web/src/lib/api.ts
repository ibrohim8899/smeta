const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const API_ROLE_HEADER = import.meta.env.VITE_SMETA_ROLE ?? "superadmin";

function authHeaders(headers?: Record<string, string>) {
  return {
    "x-smeta-role": API_ROLE_HEADER,
    ...headers
  };
}

function jsonHeaders() {
  return authHeaders({
    "Content-Type": "application/json"
  });
}

export type AuthSessionResponse = {
  accountStatus: string;
  displayName: string;
  permissions: string[];
  role: string;
  roleLabel: string;
  source: string;
};

export type PermissionMatrixResponse = Array<{
  permissions: string[];
  role: string;
  roleLabel: string;
}>;

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
  id: string;
  phone: string | null;
  publicCode: string;
  region: string;
  source: string;
  status: string;
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
  region: string;
  status: string;
  updatedAt: string;
};

export type StoreResponse = {
  active: boolean;
  categories: string[];
  commissionRate: number;
  createdAt: string;
  id: string;
  name: string;
  phone: string | null;
  serviceRegions: string[];
};

export type StoreOfferResponse = {
  createdAt: string;
  deliveryIncluded: boolean;
  id: string;
  note: string | null;
  status: string;
  store: StoreResponse;
  totalAmountUzs: number;
  validityHours: number;
};

export type OrderResponse = {
  acceptedAmountUzs: number;
  createdAt: string;
  id: string;
  publicCode: string;
  request: {
    id: string;
    publicCode: string;
    status: string;
  };
  selectedOffer: {
    id: string;
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
  baseAmountUzs: number;
  createdAt: string;
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
  platformCommissionUzs: number;
  platformNetUzs: number;
  publicCode: string;
  status: string;
  store: {
    id: string;
    name: string;
  };
  storeCommissionRateBps: number;
  storeDebtUzs: number;
  updatedAt: string;
};

export type FinanceSummaryResponse = {
  baseAmountUzs: number;
  dealerRewardUzs: number;
  ledgerCount: number;
  paidAmountUzs: number;
  paidCount: number;
  payableCount: number;
  platformCommissionUzs: number;
  platformNetUzs: number;
  storeDebtUzs: number;
};

export async function createMaterialRequest(payload: CreateMaterialRequestPayload): Promise<MaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "So'rov yuborishda xatolik bo'ldi");
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export async function fetchAuthSession(role?: string): Promise<AuthSessionResponse> {
  const headers = role
    ? {
        "x-smeta-role": role
      }
    : authHeaders();
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Rol ma'lumotini olishda xatolik bo'ldi");
  }

  return response.json() as Promise<AuthSessionResponse>;
}

export async function fetchPermissionMatrix(): Promise<PermissionMatrixResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/permissions`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Ruxsatlar ro'yxatini olishda xatolik bo'ldi");
  }

  return response.json() as Promise<PermissionMatrixResponse>;
}

export async function fetchAuditLogs(limit = 80): Promise<AuditLogResponse[]> {
  const response = await fetch(`${API_BASE_URL}/audit?limit=${limit}`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Audit tarixini olishda xatolik bo'ldi");
  }

  return response.json() as Promise<AuditLogResponse[]>;
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
    const message = await response.text();
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
  titleUz: string;
}): Promise<NotificationResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Bildirishnoma yaratishda xatolik bo'ldi");
  }

  return response.json() as Promise<NotificationResponse>;
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
    const message = await response.text();
    throw new Error(message || "Bildirishnoma statusini o'zgartirishda xatolik bo'ldi");
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
    const message = await response.text();
    throw new Error(message || "So'rov yuborishda xatolik bo'ldi");
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export async function fetchMaterialRequests(): Promise<MaterialRequestResponse[]> {
  const response = await fetch(`${API_BASE_URL}/material-requests`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "So'rovlarni olishda xatolik bo'ldi");
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
    const message = await response.text();
    throw new Error(message || "Holatni o'zgartirishda xatolik bo'ldi");
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export function getAttachmentDownloadUrl(requestId: string, attachmentId: string) {
  return `${API_BASE_URL}/material-requests/${requestId}/attachments/${attachmentId}/download`;
}

export async function cancelMaterialRequest(id: string): Promise<MaterialRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${id}`, {
    headers: authHeaders(),
    method: "DELETE"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "So'rovni bekor qilishda xatolik bo'ldi");
  }

  return response.json() as Promise<MaterialRequestResponse>;
}

export async function fetchStores(): Promise<StoreResponse[]> {
  const response = await fetch(`${API_BASE_URL}/stores`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Do'konlarni olishda xatolik bo'ldi");
  }

  return response.json() as Promise<StoreResponse[]>;
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
    const message = await response.text();
    throw new Error(message || "Do'konlarga yuborishda xatolik bo'ldi");
  }

  return response.json() as Promise<unknown>;
}

export async function fetchStoreOffers(requestId: string): Promise<StoreOfferResponse[]> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/offers`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Takliflarni olishda xatolik bo'ldi");
  }

  return response.json() as Promise<StoreOfferResponse[]>;
}

export async function createStoreOffer(
  requestId: string,
  payload: {
    deliveryIncluded?: boolean;
    note?: string;
    storeId: string;
    totalAmountUzs: number;
    validityHours?: number;
  }
): Promise<StoreOfferResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/offers`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Taklif yaratishda xatolik bo'ldi");
  }

  return response.json() as Promise<StoreOfferResponse>;
}

export async function selectOffer(requestId: string, offerId: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/select-offer/${offerId}`, {
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Taklif tanlashda xatolik bo'ldi");
  }

  return response.json() as Promise<OrderResponse>;
}

export async function fetchOrderByRequest(requestId: string): Promise<OrderResponse | null> {
  const response = await fetch(`${API_BASE_URL}/material-requests/${requestId}/order`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Buyurtmani olishda xatolik bo'ldi");
  }

  return response.json() as Promise<OrderResponse | null>;
}

export async function fetchOrders(): Promise<OrderResponse[]> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Buyurtmalarni olishda xatolik bo'ldi");
  }

  return response.json() as Promise<OrderResponse[]>;
}

export async function updateOrderStatus(orderId: string, status: string, note?: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
    body: JSON.stringify({
      note,
      status
    }),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Buyurtma holatini o'zgartirishda xatolik bo'ldi");
  }

  return response.json() as Promise<OrderResponse>;
}

export async function fetchFinanceLedger(): Promise<FinanceLedgerResponse[]> {
  const response = await fetch(`${API_BASE_URL}/finance/ledger`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Moliya jurnalini olishda xatolik bo'ldi");
  }

  return response.json() as Promise<FinanceLedgerResponse[]>;
}

export async function fetchFinanceSummary(): Promise<FinanceSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/summary`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Moliya xulosasini olishda xatolik bo'ldi");
  }

  return response.json() as Promise<FinanceSummaryResponse>;
}

export async function recordFinancePayment(ledgerId: string, amountUzs: number, note?: string): Promise<FinanceLedgerResponse> {
  const response = await fetch(`${API_BASE_URL}/finance/ledger/${ledgerId}/payment`, {
    body: JSON.stringify({
      amountUzs,
      note
    }),
    headers: jsonHeaders(),
    method: "PATCH"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "To'lovni yozishda xatolik bo'ldi");
  }

  return response.json() as Promise<FinanceLedgerResponse>;
}

export async function fetchDealers(): Promise<DealerResponse[]> {
  const response = await fetch(`${API_BASE_URL}/dealers`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Ustalarni olishda xatolik bo'ldi");
  }

  return response.json() as Promise<DealerResponse[]>;
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
    const message = await response.text();
    throw new Error(message || "Usta arizasini yaratishda xatolik bo'ldi");
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
    const message = await response.text();
    throw new Error(message || "Usta statusini o'zgartirishda xatolik bo'ldi");
  }

  return response.json() as Promise<DealerResponse>;
}
