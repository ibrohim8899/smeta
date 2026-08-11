import { useEffect, useMemo, useState } from "react";
import { AdminQueueView } from "../features/admin-queue/AdminQueueView";
import { CustomerRequestView } from "../features/customer-request/CustomerRequestView";
import { CustomerSelectionView } from "../features/customer-selection/CustomerSelectionView";
import { DashboardView } from "../features/dashboard/DashboardView";
import { DealerView } from "../features/dealer/DealerView";
import { FinanceView } from "../features/finance/FinanceView";
import { toRequestSummary } from "../features/material-requests/requestMappers";
import { NotificationsView } from "../features/notifications/NotificationsView";
import { OrderFulfillmentView } from "../features/order-fulfillment/OrderFulfillmentView";
import { SecurityView } from "../features/security/SecurityView";
import { StoreOffersView } from "../features/store-offers/StoreOffersView";
import { assignStoresToRequest, cancelMaterialRequest, fetchMaterialRequests, updateMaterialRequestStatus } from "../lib/api";
import type { RequestSummary } from "../types/domain";
import type { ViewKey } from "../types/navigation";
import { AppShell } from "./AppShell";

export function App() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);

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
    void loadRequests();
  }, []);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId),
    [requests, selectedRequestId]
  );

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {activeView === "dashboard" && (
        <DashboardView requests={requests} requestsError={requestsError} selectedRequest={selectedRequest} onOpenAdmin={() => setActiveView("admin")} />
      )}
      {activeView === "customer" && <CustomerRequestView onRequestCreated={loadRequests} />}
      {activeView === "admin" && selectedRequest && (
        <AdminQueueView
          requests={requests}
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
      {activeView === "security" && <SecurityView />}
      {activeView === "notifications" && <NotificationsView />}
    </AppShell>
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
