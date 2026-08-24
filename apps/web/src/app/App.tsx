import { useEffect, useMemo, useState } from "react";
import type { UserRole } from "@smeta/shared";
import { AdminQueueView } from "../features/admin-queue/AdminQueueView";
import { LoginView } from "../features/auth/LoginView";
import { CustomerRequestView } from "../features/customer-request/CustomerRequestView";
import { CustomerSelectionView } from "../features/customer-selection/CustomerSelectionView";
import { DashboardView } from "../features/dashboard/DashboardView";
import { DealerView } from "../features/dealer/DealerView";
import { FinanceView } from "../features/finance/FinanceView";
import { GuestRequestView } from "../features/guest-request/GuestRequestView";
import { toRequestSummary } from "../features/material-requests/requestMappers";
import { NotificationsView } from "../features/notifications/NotificationsView";
import { OrderFulfillmentView } from "../features/order-fulfillment/OrderFulfillmentView";
import { ReferralLandingView } from "../features/referral-landing/ReferralLandingView";
import { ReportsView } from "../features/reports/ReportsView";
import { SecurityView } from "../features/security/SecurityView";
import { StoreOffersView } from "../features/store-offers/StoreOffersView";
import { StoresView } from "../features/stores/StoresView";
import {
  assignStoresToRequest,
  cancelMaterialRequest,
  clearSessionToken,
  fetchAuthSession,
  fetchMaterialRequests,
  logoutCurrentSession,
  pollBrowserLogin,
  sessionClearedEventName,
  storeSessionToken,
  switchAuthRole,
  updateMaterialRequestStatus,
  type AuthSessionResponse
} from "../lib/api";
import { matchesSearch } from "../lib/search";
import type { RequestSummary } from "../types/domain";
import type { ViewKey } from "../types/navigation";
import { AppShell } from "./AppShell";

export function App() {
  const params = new URLSearchParams(window.location.search);
  const telegramContext = parseTelegramContext(params.get("tgContext"));
  const guestToken = params.get("guestToken");
  const loginNonce = params.get("loginNonce");
  const referralCode = params.get("ref") ?? (telegramContext?.kind === "referral" ? telegramContext.ref ?? null : null);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [publicCustomerFlow, setPublicCustomerFlow] = useState(false);

  async function loadRequests() {
    try {
      const apiRequests = await fetchMaterialRequests();
      const summaries = apiRequests.map(toRequestSummary);

      setRequests(summaries);
      setSelectedRequestId((currentId) => (summaries.length > 0 && summaries.some((request) => request.id === currentId) ? currentId : summaries[0]?.id ?? ""));
      setRequestsError(null);
    } catch (error) {
      setRequestsError(error instanceof Error ? error.message : "So'rovlarni yuklab bo'lmadi");
    }
  }

  async function handleStatusUpdate(apiId: string, status: string, note?: string) {
    await updateMaterialRequestStatus(apiId, status, note);
    await loadRequests();
  }

  async function handleCancel(apiId: string) {
    await cancelMaterialRequest(apiId);
    await loadRequests();
  }

  async function handleAssignStores(apiId: string) {
    await assignStoresToRequest(apiId);
    await loadRequests();
  }

  useEffect(() => {
    async function loadSession() {
      try {
        if (loginNonce) {
          const loginResult = await pollBrowserLogin(loginNonce);

          if (loginResult.status === "authenticated") {
            storeSessionToken(loginResult.accessToken);
            const nextSession = await sessionForTelegramContext(loginResult.session, telegramContext);
            setSession(nextSession);
            setSessionNotice(null);
            setActiveView(navigationFallbackForRole(nextSession.role as UserRole, telegramContext));
            window.history.replaceState({}, "", window.location.pathname);
            await loadRequests();
            return;
          }
        }

        const currentSession = await sessionForTelegramContext(await fetchAuthSession(), telegramContext);
        setSession(currentSession);
        setSessionNotice(null);
        setActiveView(navigationFallbackForRole(currentSession.role as UserRole, telegramContext));
        await loadRequests();
      } catch (sessionError) {
        setSessionNotice(sessionError instanceof Error ? normalizeSessionNotice(sessionError.message) : null);
        setSession(null);
      } finally {
        setSessionLoading(false);
      }
    }

    if (!guestToken && !referralCode) {
      void loadSession();
    } else {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleSessionCleared(event: Event) {
      const reason = event instanceof CustomEvent && typeof event.detail?.reason === "string" ? normalizeSessionNotice(event.detail.reason) : null;

      setSession(null);
      setSessionNotice(reason);
      setRequests([]);
      setSelectedRequestId("");
    }

    window.addEventListener(sessionClearedEventName(), handleSessionCleared);
    return () => window.removeEventListener(sessionClearedEventName(), handleSessionCleared);
  }, []);

  const filteredRequests = useMemo(() => filterRequests(requests, searchQuery), [requests, searchQuery]);
  const selectedRequest = useMemo(
    () => filteredRequests.find((request) => request.id === selectedRequestId) ?? filteredRequests[0],
    [filteredRequests, selectedRequestId]
  );

  if (guestToken) {
    return <GuestRequestView token={guestToken} />;
  }

  if (referralCode) {
    return <ReferralLandingView referralCode={referralCode} onRequestCreated={loadRequests} />;
  }

  if (sessionLoading) {
    return (
      <main className="min-h-screen bg-smeta-paper px-5 py-8 text-smeta-ink">
        <p className="text-sm font-semibold text-smeta-mauve">Sessiya tekshirilmoqda...</p>
      </main>
    );
  }

  if (!session) {
    if (publicCustomerFlow) {
      return (
        <main className="min-h-screen bg-smeta-paper px-5 py-5 text-smeta-ink lg:px-7">
          <div className="mx-auto max-w-4xl">
            <button className="mb-4 rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-semibold" onClick={() => setPublicCustomerFlow(false)}>
              Login ekraniga qaytish
            </button>
            <CustomerRequestView onRequestCreated={async () => undefined} />
          </div>
        </main>
      );
    }

    return <LoginView onAuthenticated={handleAuthenticated} onGuestRequest={() => setPublicCustomerFlow(true)} sessionMessage={sessionNotice} />;
  }

  function handleAuthenticated(nextSession: AuthSessionResponse) {
    setSession(nextSession);
    setSessionNotice(null);
    setActiveView(navigationFallbackForRole(nextSession.role as UserRole));
    void loadRequests();
  }

  async function handleLogout() {
    try {
      await logoutCurrentSession();
    } catch {
      clearSessionToken();
    }

    setSession(null);
    setSessionNotice(null);
    setRequests([]);
    setSelectedRequestId("");
    setSearchQuery("");
  }

  async function handleRoleSwitch(role: UserRole) {
    const result = await switchAuthRole(role);
    storeSessionToken(result.accessToken);
    setSession(result.session);
    setSessionNotice(null);
    const firstAllowedView = navigationFallbackForRole(result.session.role as UserRole);
    setActiveView(firstAllowedView);
    await loadRequests();
  }

  return (
    <AppShell
      activeView={activeView}
      searchQuery={searchQuery}
      session={session}
      onLogout={() => void handleLogout()}
      onRoleSwitch={(role) => void handleRoleSwitch(role)}
      onSearchChange={setSearchQuery}
      onViewChange={setActiveView}
    >
      {activeView === "dashboard" && (
        <DashboardView requests={filteredRequests} requestsError={requestsError} selectedRequest={selectedRequest} onOpenAdmin={() => setActiveView("admin")} />
      )}
      {activeView === "customer" && <CustomerRequestView onRequestCreated={loadRequests} />}
      {activeView === "admin" && selectedRequest && (
        <AdminQueueView
          requests={filteredRequests}
          requestsError={requestsError}
          selectedRequest={selectedRequest}
          selectedRequestId={selectedRequestId}
          onAssignStores={handleAssignStores}
          onCancel={handleCancel}
          onSelectRequest={setSelectedRequestId}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
      {activeView === "admin" && !selectedRequest && <EmptyRequestState onCreateRequest={() => setActiveView("customer")} />}
      {activeView === "stores" && <StoresView searchQuery={searchQuery} />}
      {activeView === "store" && selectedRequest && (
        <StoreOffersView searchQuery={searchQuery} selectedRequest={selectedRequest} sessionRole={session.role} sessionTelegramUserId={session.telegramUserId} />
      )}
      {activeView === "store" && !selectedRequest && <EmptyRequestState onCreateRequest={() => setActiveView("customer")} />}
      {activeView === "selection" && selectedRequest && <CustomerSelectionView selectedRequest={selectedRequest} onOrderCreated={loadRequests} />}
      {activeView === "selection" && !selectedRequest && <EmptyRequestState onCreateRequest={() => setActiveView("customer")} />}
      {activeView === "orders" && <OrderFulfillmentView searchQuery={searchQuery} onOrdersChanged={loadRequests} />}
      {activeView === "dealer" && <DealerView searchQuery={searchQuery} />}
      {activeView === "finance" && <FinanceView searchQuery={searchQuery} />}
      {activeView === "reports" && <ReportsView />}
      {activeView === "security" && <SecurityView searchQuery={searchQuery} />}
      {activeView === "notifications" && <NotificationsView searchQuery={searchQuery} />}
    </AppShell>
  );
}

type TelegramDeepLinkContext = {
  kind?: string;
  ref?: string;
  role?: UserRole;
};

function navigationFallbackForRole(role: UserRole, telegramContext?: TelegramDeepLinkContext | null): ViewKey {
  const contextView = navigationFromTelegramContext(role, telegramContext);

  if (contextView) {
    return contextView;
  }

  const fallback: Record<UserRole, ViewKey> = {
    admin: "dashboard",
    customer: "customer",
    dealer: "dealer",
    finance: "finance",
    store: "store",
    superadmin: "dashboard"
  };

  return fallback[role];
}

async function sessionForTelegramContext(session: AuthSessionResponse, telegramContext?: TelegramDeepLinkContext | null) {
  const requestedRole = telegramContext?.role;

  if (!requestedRole || session.role === requestedRole) {
    return session;
  }

  if (session.approvedRoles.includes(requestedRole)) {
    const switchedSession = await switchAuthRole(requestedRole);
    storeSessionToken(switchedSession.accessToken);
    return switchedSession.session;
  }

  clearSessionToken("Bu Telegram havola boshqa rol uchun ochilgan. Iltimos, Telegram orqali qayta kiring.");
  throw new Error("Bu Telegram havola boshqa rol uchun ochilgan. Iltimos, Telegram orqali qayta kiring.");
}

function navigationFromTelegramContext(role: UserRole, telegramContext?: TelegramDeepLinkContext | null): ViewKey | null {
  if (!telegramContext?.kind || telegramContext.kind === "home" || telegramContext.kind === "login" || telegramContext.kind === "referral") {
    return null;
  }

  if (telegramContext.kind === "order") {
    return "orders";
  }

  if (telegramContext.kind === "finance") {
    return role === "store" ? "store" : role === "dealer" ? "dealer" : "finance";
  }

  if (telegramContext.kind === "dealer") {
    return role === "dealer" || role === "admin" || role === "superadmin" ? "dealer" : navigationFallbackForRole(role);
  }

  if (telegramContext.kind === "store") {
    return role === "store" ? "store" : role === "admin" || role === "superadmin" ? "stores" : navigationFallbackForRole(role);
  }

  if (telegramContext.kind === "notifications" || telegramContext.kind === "support") {
    return "notifications";
  }

  if (telegramContext.kind === "request") {
    if (role === "store") {
      return "store";
    }

    if (role === "dealer") {
      return "dealer";
    }

    if (role === "admin" || role === "superadmin") {
      return "admin";
    }

    return "customer";
  }

  return null;
}

function parseTelegramContext(token: string | null): TelegramDeepLinkContext | null {
  if (!token) {
    return null;
  }

  try {
    const [payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const parsed = JSON.parse(window.atob(padded)) as TelegramDeepLinkContext;

    return typeof parsed.kind === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeSessionNotice(message: string) {
  if (message.includes("Sessiya tokeni") || message.includes("Sessiya roli") || message.includes("Sessiya topilmadi")) {
    return "Sessiya topilmadi yoki bekor qilingan. Iltimos, Telegram orqali qayta kiring.";
  }

  if (message.includes("Sessiya muddati tugagan") || message.includes("muddati tugagan")) {
    return "Sessiya muddati tugagan. Iltimos, Telegram orqali qayta kiring.";
  }

  return message;
}

function filterRequests(requests: RequestSummary[], query: string) {
  if (!query.trim()) {
    return requests;
  }

  return requests.filter((request) =>
    matchesSearch(query, [
      request.id,
      request.apiId,
      request.customer,
      request.region,
      request.category,
      request.dealer,
      request.description,
      request.source,
      request.status,
      request.statusLabel,
      request.budget,
      request.files
    ])
  );
}

function EmptyRequestState({ onCreateRequest }: { onCreateRequest: () => void }) {
  return (
    <section className="rounded-lg border border-smeta-line bg-white p-6 text-center shadow-sm">
      <h3 className="text-lg font-semibold">Hali material so'rovi yo'q</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-smeta-mauve">
        Bu sahifa real baza bilan ishlaydi. Avval mijoz so'rovini yarating, keyin admin, do'kon taklifi va mijoz tanlovi oqimi ochiladi.
      </p>
      <button className="mt-4 rounded-md bg-smeta-deep px-4 py-2 text-sm font-semibold text-white" onClick={onCreateRequest}>
        Mijoz so'rovi yaratish
      </button>
    </section>
  );
}
