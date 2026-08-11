import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { StatusPill } from "../../components/ui/StatusPill";
import { fetchOrderByRequest, fetchStoreOffers, selectOffer, type OrderResponse, type StoreOfferResponse } from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import type { RequestSummary } from "../../types/domain";

type CustomerSelectionViewProps = {
  onOrderCreated: () => Promise<void>;
  selectedRequest: RequestSummary;
};

export function CustomerSelectionView({ onOrderCreated, selectedRequest }: CustomerSelectionViewProps) {
  const [offers, setOffers] = useState<StoreOfferResponse[]>([]);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      const [offersResult, orderResult] = await Promise.all([
        fetchStoreOffers(selectedRequest.apiId),
        fetchOrderByRequest(selectedRequest.apiId)
      ]);
      setOffers(offersResult);
      setOrder(orderResult);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Takliflarni yuklab bo'lmadi");
    }
  }

  useEffect(() => {
    void loadData();
  }, [selectedRequest.apiId]);

  async function handleSelectOffer(offerId: string) {
    setBusyOfferId(offerId);
    setError(null);

    try {
      const createdOrder = await selectOffer(selectedRequest.apiId, offerId);
      setOrder(createdOrder);
      await loadData();
      await onOrderCreated();
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Taklif tanlanmadi");
    } finally {
      setBusyOfferId(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Mijoz taklif tanlashi: {selectedRequest.id}</h3>
            <p className="mt-1 text-sm text-smeta-mauve">Mijoz faqat bitta do'kon taklifini tanlaydi.</p>
          </div>
          <StatusPill label={selectedRequest.statusLabel} />
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 grid gap-3">
          {offers.length === 0 ? (
            <div className="rounded-md bg-smeta-soft px-4 py-5 text-sm text-smeta-mauve">
              Hali taklif yo'q. Avval do'kon taklif yaratishi kerak.
            </div>
          ) : (
            offers.map((offer) => {
              const selected = order?.selectedOffer.id === offer.id || offer.status === "selected";
              return (
                <article key={offer.id} className="rounded-lg border border-smeta-line bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold">{offer.store.name}</p>
                      <p className="mt-1 text-sm text-smeta-mauve">{offer.note || "Izoh yo'q"}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xl font-semibold">{offer.totalAmountUzs.toLocaleString("uz-UZ")} UZS</p>
                      <p className="mt-1 text-xs text-smeta-mauve">
                        {offer.validityHours} soat · {offer.deliveryIncluded ? "Yetkazish narx ichida" : "Yetkazish alohida"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <StatusPill label={offer.status} />
                    <button
                      className="flex items-center gap-2 rounded-md bg-smeta-clay px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={Boolean(order) || Boolean(busyOfferId)}
                      onClick={() => handleSelectOffer(offer.id)}
                    >
                      {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                      {selected ? "Tanlangan" : busyOfferId === offer.id ? "Tanlanmoqda..." : "Shuni tanlash"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Buyurtma holati</h3>
        {order ? (
          <div className="mt-5 space-y-3">
            <Info label="Buyurtma" value={order.publicCode} />
            <Info label="Do'kon" value={order.store.name} />
            <Info label="Summa" value={`${order.acceptedAmountUzs.toLocaleString("uz-UZ")} UZS`} />
            <Info label="Holat" value={formatStatusLabel(order.status)} />
            <Info label="Izoh" value={order.statusNote || "Izoh yo'q"} />
          </div>
        ) : (
          <p className="mt-5 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">
            Taklif tanlangandan keyin buyurtma "{formatStatusLabel("pending_store_acceptance")}" statusida yaratiladi.
          </p>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-smeta-soft px-3 py-3">
      <p className="text-xs text-smeta-mauve">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
