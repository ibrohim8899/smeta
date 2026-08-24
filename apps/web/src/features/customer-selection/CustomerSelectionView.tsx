import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, PackageCheck, ShoppingBag, Store, Truck, WalletCards } from "lucide-react";
import { StatusPill } from "../../components/ui/StatusPill";
import { fetchOrderByRequest, fetchStoreOffers, selectOffer, type OrderResponse, type StoreOfferResponse } from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import type { RequestSummary } from "../../types/domain";

type CustomerSelectionViewProps = {
  onOrderCreated: () => Promise<void>;
  selectedRequest: RequestSummary;
};

function formatMoney(amount: number) {
  return `${amount.toLocaleString("uz-UZ")} UZS`;
}

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

  const bestOfferAmount = offers.length > 0 ? Math.min(...offers.map((offer) => offer.totalAmountUzs)) : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="smeta-card overflow-hidden">
        <div className="border-b border-smeta-line bg-[linear-gradient(135deg,_rgb(var(--smeta-soft)/0.94),_rgb(var(--smeta-elevated)/0.82))] p-5 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-smeta-line bg-smeta-surface/75 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-smeta-mauve">
                <ShoppingBag className="h-3.5 w-3.5 text-smeta-clay" />
                Taklif tanlash
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight">Mijoz taklif tanlashi: {selectedRequest.id}</h3>
              <p className="mt-2 text-sm leading-6 text-smeta-mauve">Bitta do'kon tanlanadi. Tanlangandan keyin buyurtma ochiladi.</p>
            </div>
            <StatusPill label={selectedRequest.statusLabel} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SummaryTile icon={Store} label="Takliflar" value={`${offers.length} ta`} />
            <SummaryTile icon={WalletCards} label="Eng past narx" value={bestOfferAmount ? formatMoney(bestOfferAmount) : "Hali yo'q"} />
            <SummaryTile icon={Clock3} label="Holat" value={order ? "Tanlangan" : "Tanlash kerak"} />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

          {offers.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-smeta-line bg-smeta-soft/55 px-6 py-10 text-center">
              <PackageCheck className="h-10 w-10 text-smeta-mauve" />
              <h4 className="mt-4 text-lg font-black text-smeta-ink">Hali taklif yo'q</h4>
              <p className="mt-2 max-w-md text-sm leading-6 text-smeta-mauve">Avval do'kon narx va yetkazish shartlarini yuborishi kerak.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {offers.map((offer) => {
                const selected = order?.selectedOffer.id === offer.id || offer.status === "selected";
                const best = bestOfferAmount === offer.totalAmountUzs;
                return (
                  <article key={offer.id} className={`rounded-2xl border p-4 shadow-smeta-soft ${selected ? "border-emerald-300 bg-emerald-50/60" : "border-smeta-line bg-smeta-surface"}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-smeta-soft text-smeta-clay">
                            <Store className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-base font-black text-smeta-ink">{offer.store.name}</p>
                            <p className="mt-0.5 text-sm font-medium text-smeta-mauve">{offer.note || "Izoh kiritilmagan"}</p>
                          </div>
                          {best ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Eng arzon</span> : null}
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-2xl font-black text-smeta-ink">{formatMoney(offer.totalAmountUzs)}</p>
                        <p className="mt-1 text-xs font-bold text-smeta-mauve">{offer.validityHours} soat amal qiladi</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Info icon={PackageCheck} label="Materiallar" value={formatMoney(offer.materialSubtotalUzs)} />
                      <Info icon={Truck} label="Yetkazish" value={formatMoney(offer.deliveryFeeUzs)} />
                      <Info icon={Clock3} label="Muddat" value={offer.deliveryEstimate || "Kiritilmagan"} />
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-smeta-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill label={offer.status} />
                        <span className="rounded-full bg-smeta-soft px-3 py-1.5 text-xs font-bold text-smeta-mauve">
                          {offer.completeListAvailable ? "Ro'yxat to'liq" : "Ro'yxat to'liq emas"}
                        </span>
                      </div>
                      <button
                        className="smeta-primary-button min-h-11 w-full sm:w-auto"
                        disabled={Boolean(order) || Boolean(busyOfferId)}
                        onClick={() => handleSelectOffer(offer.id)}
                      >
                        {selected ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        {selected ? "Tanlangan" : busyOfferId === offer.id ? "Tanlanmoqda..." : "Shu taklifni tanlash"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="smeta-card h-fit p-5 shadow-smeta xl:sticky xl:top-24">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-smeta-soft text-smeta-clay">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black">Keyingi qadam</h3>
            <p className="mt-1 text-sm leading-6 text-smeta-mauve">Taklif tanlangandan keyin buyurtma ochiladi.</p>
          </div>
        </div>

        {order ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-black">Taklif tanlangan</p>
              <p className="mt-1 leading-5">Buyurtma do'kon qabul qilishini kutmoqda.</p>
            </div>
            <Info label="Buyurtma" value={order.publicCode} />
            <Info label="Do'kon" value={order.store.name} />
            <Info label="Tanlangan summa" value={formatMoney(order.acceptedAmountUzs)} />
            <Info label="Yakuniy summa" value={formatMoney(order.finalAmountUzs)} />
            <Info label="Holat" value={formatStatusLabel(order.status)} />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <Step number="1" text="Narx, yetkazish va izohni solishtiring." />
            <Step number="2" text={'Mos taklif yonidagi "Shu taklifni tanlash" tugmasini bosing.'} />
            <Step number="3" text={`Buyurtma "${formatStatusLabel("pending_store_acceptance")}" holatida ochiladi.`} />
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon?: typeof PackageCheck; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-smeta-line bg-smeta-soft/72 px-3 py-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-smeta-clay" /> : null}
        <p className="text-xs font-extrabold text-smeta-mauve">{label}</p>
      </div>
      <p className="mt-1 text-sm font-black text-smeta-ink">{value}</p>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-smeta-line bg-smeta-surface/75 p-4 shadow-smeta-soft">
      <Icon className="h-5 w-5 text-smeta-clay" />
      <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">{label}</p>
      <p className="mt-1 text-lg font-black text-smeta-ink">{value}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-smeta-line bg-smeta-soft/65 px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-smeta-clay text-xs font-black text-white">{number}</span>
      <p className="text-sm font-semibold leading-6 text-smeta-ink">{text}</p>
    </div>
  );
}
