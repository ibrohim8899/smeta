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
import {
  assignStoresToRequest,
  cancelMaterialRequest,
  clearSessionToken,
  fetchAuthSession,
  fetchMaterialRequests,
  logoutCurrentSession,
  pollBrowserLogin,
  storeSessionToken,
  switchAuthRole,
  updateMaterialRequestStatus,
  type AuthSessionResponse
} from "../lib/api";
import type { RequestSummary } from "../types/domain";
import type { ViewKey } from "../types/navigation";
import { AppShell } from "./AppShell";

export function App() {
  const params = new URLSearchParams(window.location.search);
  const guestToken = params.get("guestToken");
  const loginNonce = params.get("loginNonce");
  const referralCode = params.get("ref");
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
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
            setSession(loginResult.session);
            setActiveView(navigationFallbackForRole(loginResult.session.role as UserRole));
            window.history.replaceState({}, "", window.location.pathname);
            await loadRequests();
            return;
          }
        }

        const currentSession = await fetchAuthSession();
        setSession(currentSession);
        setActiveView(navigationFallbackForRole(currentSession.role as UserRole));
        await loadRequests();
      } catch {
        clearSessionToken();
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
            <CustomerRequestView onRequestCreated={async () => setPublicCustomerFlow(false)} />
          </div>
        </main>
      );
    }

    return <LoginView onAuthenticated={handleAuthenticated} onGuestRequest={() => setPublicCustomerFlow(true)} />;
  }

  function handleAuthenticated(nextSession: AuthSessionResponse) {
    setSession(nextSession);
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
    setRequests([]);
    setSelectedRequestId("");
    setSearchQuery("");
  }

  async function handleRoleSwitch(role: UserRole) {
    const result = await switchAuthRole(role);
    storeSessionToken(result.accessToken);
    setSession(result.session);
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
      {activeView === "store" && selectedRequest && <StoreOffersView selectedRequest={selectedRequest} />}
      {activeView === "store" && !selectedRequest && <EmptyRequestState onCreateRequest={() => setActiveView("customer")} />}
      {activeView === "selection" && selectedRequest && <CustomerSelectionView selectedRequest={selectedRequest} onOrderCreated={loadRequests} />}
      {activeView === "selection" && !selectedRequest && <EmptyRequestState onCreateRequest={() => setActiveView("customer")} />}
      {activeView === "orders" && <OrderFulfillmentView onOrdersChanged={loadRequests} />}
      {activeView === "dealer" && <DealerView />}
      {activeView === "finance" && <FinanceView />}
      {activeView === "reports" && <ReportsView />}
      {activeView === "security" && <SecurityView />}
      {activeView === "notifications" && <NotificationsView />}
    </AppShell>
  );
}

function navigationFallbackForRole(role: UserRole): ViewKey {
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

function filterRequests(requests: RequestSummary[], query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return requests;
  }

  return requests.filter((request) =>
    [
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
    ]
      .filter(Boolean)
      .some((value) => normalizeSearch(String(value)).includes(normalizedQuery))
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/ʻ|‘|’|`/g, "'");
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
