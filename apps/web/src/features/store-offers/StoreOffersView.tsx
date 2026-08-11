import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "../../components/ui/StatusPill";
import { createStoreOffer, fetchStoreOffers, fetchStores, type StoreOfferResponse, type StoreResponse } from "../../lib/api";
import type { RequestSummary } from "../../types/domain";

type StoreOffersViewProps = {
  selectedRequest: RequestSummary;
};

export function StoreOffersView({ selectedRequest }: StoreOffersViewProps) {
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [offers, setOffers] = useState<StoreOfferResponse[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [totalAmount, setTotalAmount] = useState("23950000");
  const [validityHours, setValidityHours] = useState("48");
  const [deliveryIncluded, setDeliveryIncluded] = useState(false);
  const [note, setNote] = useState("To'liq ro'yxat bo'yicha umumiy taklif");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStores = useMemo(() => stores.filter((store) => store.active), [stores]);

  async function loadData() {
    try {
      const [storesResult, offersResult] = await Promise.all([fetchStores(), fetchStoreOffers(selectedRequest.apiId)]);
      setStores(storesResult);
      setOffers(offersResult);
      setSelectedStoreId((current) => current || storesResult[0]?.id || "");
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Do'kon takliflari yuklanmadi");
    }
  }

  useEffect(() => {
    void loadData();
  }, [selectedRequest.apiId]);

  async function handleCreateOffer() {
    setIsSubmitting(true);
    setError(null);

    try {
      await createStoreOffer(selectedRequest.apiId, {
        deliveryIncluded,
        note,
        storeId: selectedStoreId,
        totalAmountUzs: Number(totalAmount),
        validityHours: Number(validityHours)
      });
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Taklif yaratilmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Takliflar: {selectedRequest.id}</h3>
            <p className="mt-1 text-sm text-smeta-mauve">Do'konlar raqib narxlarini ko'rmaydi, admin va mijoz esa solishtiradi.</p>
          </div>
          <StatusPill label={selectedRequest.statusLabel} />
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-smeta-mauve">
                <th className="border-b border-smeta-line px-3 py-3">Do'kon</th>
                <th className="border-b border-smeta-line px-3 py-3">Jami</th>
                <th className="border-b border-smeta-line px-3 py-3">Yetkazish</th>
                <th className="border-b border-smeta-line px-3 py-3">Muddat</th>
                <th className="border-b border-smeta-line px-3 py-3">Holat</th>
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 ? (
                <tr>
                  <td className="border-b border-smeta-line px-3 py-6 text-smeta-mauve" colSpan={5}>
                    Hali taklif yo'q. Avval admin so'rovni do'konlarga yuboradi, keyin do'kon taklif beradi.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="border-b border-smeta-line px-3 py-4 font-semibold">{offer.store.name}</td>
                    <td className="border-b border-smeta-line px-3 py-4">{offer.totalAmountUzs.toLocaleString("uz-UZ")} UZS</td>
                    <td className="border-b border-smeta-line px-3 py-4">{offer.deliveryIncluded ? "Kiritilgan" : "Alohida"}</td>
                    <td className="border-b border-smeta-line px-3 py-4">{offer.validityHours} soat</td>
                    <td className="border-b border-smeta-line px-3 py-4">
                      <StatusPill label={offer.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Do'kon taklifini yaratish</h3>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-smeta-mauve">Do'kon</span>
            <select
              className="mt-1 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
            >
              {activeStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-smeta-mauve">Umumiy summa, UZS</span>
            <input
              className="mt-1 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
              inputMode="numeric"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-smeta-mauve">Amal qilish muddati, soat</span>
            <input
              className="mt-1 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
              inputMode="numeric"
              value={validityHours}
              onChange={(event) => setValidityHours(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="flex items-center gap-2 rounded-md bg-smeta-soft px-3 py-3 text-sm font-semibold">
            <input checked={deliveryIncluded} type="checkbox" onChange={(event) => setDeliveryIncluded(event.target.checked)} />
            Dostavka narx ichida
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-smeta-mauve">Izoh</span>
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>

        <button
          className="mt-5 w-full rounded-md bg-smeta-clay px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !selectedStoreId || !totalAmount}
          onClick={handleCreateOffer}
        >
          {isSubmitting ? "Saqlanmoqda..." : "Taklif yuborish"}
        </button>
      </section>
    </div>
  );
}
