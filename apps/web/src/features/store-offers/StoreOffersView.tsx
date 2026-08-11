import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { CheckCircle2, Clock3, PackageSearch, Send, ShieldCheck, Store, Truck, WalletCards } from "lucide-react";
import { StatusPill } from "../../components/ui/StatusPill";
import { createStoreOffer, fetchStoreOffers, fetchStores, type StoreOfferResponse, type StoreResponse } from "../../lib/api";
import type { RequestSummary } from "../../types/domain";

type StoreOffersViewProps = {
  selectedRequest: RequestSummary;
};

const moneyFormatter = new Intl.NumberFormat("uz-UZ");

function formatMoney(amount: number) {
  return `${moneyFormatter.format(amount)} UZS`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

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
  const bestOfferAmount = useMemo(() => {
    if (offers.length === 0) {
      return null;
    }

    return Math.min(...offers.map((offer) => offer.totalAmountUzs));
  }, [offers]);
  const deliveryIncludedCount = useMemo(() => offers.filter((offer) => offer.deliveryIncluded).length, [offers]);

  async function loadData() {
    try {
      const [storesResult, offersResult] = await Promise.all([fetchStores(), fetchStoreOffers(selectedRequest.apiId)]);
      const firstActiveStore = storesResult.find((store) => store.active);

      setStores(storesResult);
      setOffers(offersResult);
      setSelectedStoreId((current) => current || firstActiveStore?.id || storesResult[0]?.id || "");
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="smeta-card overflow-hidden">
        <div className="border-b border-smeta-line bg-[linear-gradient(135deg,_rgb(var(--smeta-soft)/0.92),_rgb(var(--smeta-elevated)/0.78))] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-smeta-line bg-smeta-surface/70 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-smeta-mauve">
                <ShieldCheck className="h-3.5 w-3.5 text-smeta-clay" />
                Maxfiy taklif yig'ish
              </div>
              <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Takliflar: {selectedRequest.id}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-smeta-mauve">
                Do'konlar raqib narxlarini ko'rmaydi. Admin takliflarni solishtiradi, mijoz esa faqat tasdiqlash bosqichida ko'radi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={selectedRequest.statusLabel} />
              <span className="inline-flex items-center rounded-full border border-smeta-line bg-smeta-surface/75 px-3 py-1.5 text-xs font-bold text-smeta-ink">
                {selectedRequest.category}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <OfferStat icon={WalletCards} label="Takliflar" value={`${offers.length} ta`} note="Do'konlardan kelgan javoblar" />
            <OfferStat icon={Store} label="Faol do'konlar" value={`${activeStores.length} ta`} note="Taklif yuborishi mumkin" />
            <OfferStat icon={Truck} label="Eng yaxshi narx" value={bestOfferAmount ? formatMoney(bestOfferAmount) : "Hali yo'q"} note={`${deliveryIncludedCount} ta taklifda dostavka bor`} />
          </div>
        </div>

        {error ? (
          <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:mx-6">
            {error}
          </div>
        ) : null}

        <div className="p-5 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-smeta-line bg-smeta-surface">
            <div className="flex flex-col gap-3 border-b border-smeta-line bg-smeta-soft/70 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-extrabold text-smeta-ink">Do'konlar bo'yicha takliflar jadvali</p>
                <p className="mt-1 text-xs font-medium text-smeta-mauve">Jadval admin nazorati va keyingi mijoz tanlovi uchun ishlatiladi.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-smeta-surface px-3 py-1.5 text-xs font-bold text-smeta-mauve">
                <Clock3 className="h-3.5 w-3.5" />
                {selectedRequest.deadline}
              </span>
            </div>

            <div className="overflow-x-auto">
              {offers.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-smeta-soft text-smeta-clay shadow-smeta-soft">
                    <PackageSearch className="h-7 w-7" />
                  </div>
                  <h4 className="mt-5 text-lg font-bold">Hali taklif yo'q</h4>
                  <p className="mt-2 max-w-md text-sm leading-6 text-smeta-mauve">
                    Avval admin so'rovni mos do'konlarga yuboradi. Keyin har bir do'kon umumiy narx, muddat va dostavka shartini kiritadi.
                  </p>
                </div>
              ) : (
                <table className="smeta-table min-w-[820px] text-sm">
                  <thead>
                    <tr>
                      <th>Do'kon</th>
                      <th>Jami</th>
                      <th>Yetkazish</th>
                      <th>Muddat</th>
                      <th>Yuborilgan</th>
                      <th>Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer) => (
                      <tr key={offer.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-smeta-soft text-smeta-clay">
                              <Store className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-extrabold">{offer.store.name}</p>
                              <p className="mt-1 text-xs font-medium text-smeta-mauve">{offer.store.phone || "Telefon kiritilmagan"}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="font-extrabold">{formatMoney(offer.totalAmountUzs)}</p>
                          {offer.totalAmountUzs === bestOfferAmount ? <p className="mt-1 text-xs font-bold text-smeta-clay">Eng past narx</p> : null}
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-2 rounded-full bg-smeta-soft px-3 py-1.5 text-xs font-bold text-smeta-ink">
                            {offer.deliveryIncluded ? <CheckCircle2 className="h-3.5 w-3.5 text-smeta-clay" /> : <Truck className="h-3.5 w-3.5 text-smeta-mauve" />}
                            {offer.deliveryIncluded ? "Narx ichida" : "Alohida"}
                          </span>
                        </td>
                        <td className="font-semibold">{offer.validityHours} soat</td>
                        <td className="text-sm font-semibold text-smeta-mauve">{formatDate(offer.createdAt)}</td>
                        <td>
                          <StatusPill label={offer.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="smeta-card h-fit p-5 shadow-smeta xl:sticky xl:top-24">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-smeta-soft text-smeta-clay">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Do'kon taklifini yaratish</h3>
            <p className="mt-1 text-sm leading-6 text-smeta-mauve">Admin yoki do'kon operatori umumiy narxni shu yerdan kiritadi.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="smeta-label">Do'kon</span>
            <select className="smeta-input" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
              {activeStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="smeta-label">Umumiy summa, UZS</span>
            <input className="smeta-input" inputMode="numeric" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value.replace(/\D/g, ""))} />
          </label>

          <label className="block">
            <span className="smeta-label">Amal qilish muddati, soat</span>
            <input className="smeta-input" inputMode="numeric" value={validityHours} onChange={(event) => setValidityHours(event.target.value.replace(/\D/g, ""))} />
          </label>

          <label className="smeta-panel flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-bold">
            <input checked={deliveryIncluded} className="h-4 w-4 accent-[rgb(var(--smeta-clay))]" type="checkbox" onChange={(event) => setDeliveryIncluded(event.target.checked)} />
            <span>Dostavka narx ichida</span>
          </label>

          <label className="block">
            <span className="smeta-label">Izoh</span>
            <textarea className="smeta-input min-h-28 resize-none" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>

        <button className="smeta-primary-button mt-6 w-full" disabled={isSubmitting || !selectedStoreId || !totalAmount} onClick={handleCreateOffer}>
          <Send className="h-4 w-4" />
          {isSubmitting ? "Saqlanmoqda..." : "Taklif yuborish"}
        </button>

        {activeStores.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-smeta-line bg-smeta-soft px-4 py-3 text-sm font-semibold text-smeta-mauve">
            Faol do'kon topilmadi. Taklif yaratishdan oldin kamida bitta do'kon aktiv bo'lishi kerak.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

type OfferStatProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  note: string;
  value: string;
};

function OfferStat({ icon: Icon, label, note, value }: OfferStatProps) {
  return (
    <div className="rounded-2xl border border-smeta-line bg-smeta-surface/72 p-4 shadow-smeta-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-smeta-soft text-smeta-clay">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">{label}</p>
          <p className="mt-1 truncate text-lg font-black">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-medium leading-5 text-smeta-mauve">{note}</p>
    </div>
  );
}
