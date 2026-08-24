import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { AlertTriangle, Ban, CheckCircle2, Clock3, Inbox, PackageSearch, RefreshCw, Send, ShieldCheck, Store, Truck, WalletCards } from "lucide-react";
import { StatusPill } from "../../components/ui/StatusPill";
import {
  createStoreOffer,
  declineStoreRequest,
  fetchStoreInbox,
  fetchOwnStoreOffers,
  fetchStoreOffers,
  fetchStores,
  withdrawStoreOffer,
  type StoreInboxItemResponse,
  type StoreOfferResponse,
  type StoreResponse
} from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import { matchesSearch } from "../../lib/search";
import type { RequestSummary } from "../../types/domain";

type StoreOffersViewProps = {
  searchQuery?: string;
  selectedRequest: RequestSummary;
  sessionRole?: string;
  sessionTelegramUserId?: string | null;
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

export function StoreOffersView({ searchQuery = "", selectedRequest, sessionRole, sessionTelegramUserId }: StoreOffersViewProps) {
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [offers, setOffers] = useState<StoreOfferResponse[]>([]);
  const [storeInbox, setStoreInbox] = useState<StoreInboxItemResponse[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [materialSubtotal, setMaterialSubtotal] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [validityHours, setValidityHours] = useState("48");
  const [completeListAvailable, setCompleteListAvailable] = useState(true);
  const [note, setNote] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInboxLoading, setIsInboxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStoreSession = sessionRole === "store";
  const activeStores = useMemo(() => stores.filter((store) => store.active && store.status === "approved"), [stores]);
  const ownStore = useMemo(
    () => activeStores.find((store) => Boolean(store.telegramUserId) && store.telegramUserId === sessionTelegramUserId) ?? null,
    [activeStores, sessionTelegramUserId]
  );
  const selectedStore = useMemo(() => stores.find((store) => store.id === selectedStoreId) ?? null, [selectedStoreId, stores]);
  const currentInboxItem = useMemo(
    () => storeInbox.find((item) => item.requestId === selectedRequest.apiId) ?? null,
    [selectedRequest.apiId, storeInbox]
  );
  const selectedStoreMatchesRegion = selectedStore?.serviceRegions.includes(selectedRequest.region) ?? false;
  const selectedStoreMatchesCategory =
    selectedStore?.categories.some((storeCategory) => storeCategory.toLowerCase() === selectedRequest.category.toLowerCase()) ?? false;
  const canCreateOffer = Boolean(selectedStoreId && materialSubtotal && completeListAvailable && currentInboxItem);
  const bestOfferAmount = useMemo(() => {
    if (offers.length === 0) {
      return null;
    }

    return Math.min(...offers.map((offer) => offer.totalAmountUzs));
  }, [offers]);
  const filteredOffers = useMemo(
    () =>
      offers.filter((offer) =>
        matchesSearch(searchQuery, [
          offer.store.name,
          offer.store.phone,
          offer.status,
          formatStatusLabel(offer.status),
          offer.totalAmountUzs,
          offer.materialSubtotalUzs,
          offer.deliveryFeeUzs,
          offer.deliveryEstimate,
          offer.note
        ])
      ),
    [offers, searchQuery]
  );
  const filteredStoreInbox = useMemo(
    () =>
      storeInbox.filter((item) =>
        matchesSearch(searchQuery, [
          item.publicCode,
          item.customerDisplay,
          item.region,
          item.category,
          item.description,
          item.recipientStatus,
          formatStatusLabel(item.recipientStatus),
          item.requestStatus,
          formatStatusLabel(item.requestStatus),
          item.offer?.status,
          item.offer?.totalAmountUzs
        ])
      ),
    [searchQuery, storeInbox]
  );
  const freeDeliveryCount = useMemo(() => offers.filter((offer) => offer.deliveryFeeUzs === 0).length, [offers]);
  const finalTotalPreview = Number(materialSubtotal || 0) + Number(deliveryFee || 0);

  async function loadData() {
    try {
      const storesResult = await fetchStores();
      const nextActiveStores = storesResult.filter((store) => store.active && store.status === "approved");
      const nextOwnStore =
        isStoreSession && sessionTelegramUserId
          ? nextActiveStores.find((store) => store.telegramUserId === sessionTelegramUserId) ?? null
          : null;
      const firstActiveStore = nextActiveStores[0];
      const nextSelectedStoreId = isStoreSession
        ? nextOwnStore?.id || ""
        : selectedStoreId && storesResult.some((store) => store.id === selectedStoreId)
          ? selectedStoreId
          : firstActiveStore?.id || "";
      const offersResult =
        isStoreSession && nextSelectedStoreId
          ? await fetchOwnStoreOffers(selectedRequest.apiId, nextSelectedStoreId)
          : isStoreSession
            ? []
            : await fetchStoreOffers(selectedRequest.apiId);

      setStores(storesResult);
      setOffers(offersResult);
      setSelectedStoreId(nextSelectedStoreId);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Do'kon takliflari yuklanmadi");
    }
  }

  useEffect(() => {
    void loadData();
  }, [isStoreSession, selectedRequest.apiId, sessionTelegramUserId]);

  async function handleCreateOffer() {
    setIsSubmitting(true);
    setError(null);

    try {
      await createStoreOffer(selectedRequest.apiId, {
        completeListAvailable,
        deliveryEstimate,
        deliveryFeeUzs: Number(deliveryFee || 0),
        note,
        materialSubtotalUzs: Number(materialSubtotal),
        storeId: selectedStoreId,
        validityHours: Number(validityHours)
      });
      await loadData();
      await loadStoreInbox(selectedStoreId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Taklif yaratilmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadStoreInbox(storeId: string) {
    if (!storeId) {
      setStoreInbox([]);
      return;
    }

    setIsInboxLoading(true);

    try {
      setStoreInbox(await fetchStoreInbox(storeId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Do'kon ish ro'yxati yuklanmadi");
    } finally {
      setIsInboxLoading(false);
    }
  }

  useEffect(() => {
    void loadStoreInbox(selectedStoreId);
  }, [selectedStoreId]);

  async function handleDeclineRequest() {
    if (!selectedStoreId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await declineStoreRequest(selectedRequest.apiId, selectedStoreId, actionReason || "Do'kon bu so'rovni bajara olmaydi");
      await loadData();
      await loadStoreInbox(selectedStoreId);
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : "So'rov rad etilmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWithdrawOffer() {
    if (!currentInboxItem?.offer) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await withdrawStoreOffer(selectedRequest.apiId, currentInboxItem.offer.id, actionReason || "Do'kon taklifni yangilash uchun qaytardi");
      await loadData();
      await loadStoreInbox(selectedStoreId);
    } catch (withdrawError) {
      setError(withdrawError instanceof Error ? withdrawError.message : "Taklif qaytarilmadi");
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
                Do'kon takliflari
              </div>
              <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Takliflar: {selectedRequest.id}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-smeta-mauve">
                Admin takliflarni solishtiradi. Do'kon faqat o'ziga yuborilgan so'rovlarni va o'z taklifini ko'radi.
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
            <OfferStat icon={Truck} label="Eng yaxshi narx" value={bestOfferAmount ? formatMoney(bestOfferAmount) : "Hali yo'q"} note={`${freeDeliveryCount} ta taklifda yetkazish 0 UZS`} />
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
              {filteredOffers.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-smeta-soft text-smeta-clay shadow-smeta-soft">
                    <PackageSearch className="h-7 w-7" />
                  </div>
                  <h4 className="mt-5 text-lg font-bold">{searchQuery.trim() ? "Qidiruv bo'yicha taklif topilmadi" : "Hali taklif yo'q"}</h4>
                  <p className="mt-2 max-w-md text-sm leading-6 text-smeta-mauve">
                    {searchQuery.trim()
                      ? "Boshqa kalit so'z bilan qidiring yoki filtrni tozalang."
                      : "Avval admin so'rovni mos do'konlarga yuboradi. Keyin har bir do'kon umumiy narx, muddat va dostavka shartini kiritadi."}
                  </p>
                </div>
              ) : (
                <table className="smeta-table min-w-[820px] text-sm">
                  <thead>
                    <tr>
                      <th>Do'kon</th>
                      <th>Material</th>
                      <th>Yetkazish</th>
                      <th>Yakuniy</th>
                      <th>Yetkazish</th>
                      <th>Muddat</th>
                      <th>Yuborilgan</th>
                      <th>Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOffers.map((offer) => (
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
                          <p className="font-bold">{formatMoney(offer.materialSubtotalUzs)}</p>
                          <p className="mt-1 text-xs font-medium text-smeta-mauve">Komissiya bazasi</p>
                        </td>
                        <td>
                          <p className="font-bold">{formatMoney(offer.deliveryFeeUzs)}</p>
                          <p className="mt-1 text-xs font-medium text-smeta-mauve">{offer.deliveryFeeUzs === 0 ? "Tekin / ichida" : "Alohida summa"}</p>
                        </td>
                        <td>
                          <p className="font-extrabold">{formatMoney(offer.totalAmountUzs)}</p>
                          {offer.totalAmountUzs === bestOfferAmount ? <p className="mt-1 text-xs font-bold text-smeta-clay">Eng past yakuniy narx</p> : null}
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-2 rounded-full bg-smeta-soft px-3 py-1.5 text-xs font-bold text-smeta-ink">
                            {offer.completeListAvailable ? <CheckCircle2 className="h-3.5 w-3.5 text-smeta-clay" /> : <Truck className="h-3.5 w-3.5 text-smeta-mauve" />}
                            {offer.deliveryEstimate || "Muddati kiritilmagan"}
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

          <div className="mt-5 overflow-hidden rounded-2xl border border-smeta-line bg-smeta-surface">
            <div className="flex flex-col gap-3 border-b border-smeta-line bg-smeta-soft/70 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-extrabold text-smeta-ink">Do'konning ish ro'yxati</p>
                <p className="mt-1 text-xs font-medium text-smeta-mauve">{selectedStore?.name ?? "Do'kon tanlanmagan"} uchun yuborilgan so'rovlar</p>
              </div>
              <button className="smeta-secondary-button w-fit" disabled={!selectedStoreId || isInboxLoading} onClick={() => void loadStoreInbox(selectedStoreId)}>
                <RefreshCw className="h-4 w-4" />
                Yangilash
              </button>
            </div>

            {filteredStoreInbox.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-8 text-center">
                <Inbox className="h-9 w-9 text-smeta-mauve" />
                <p className="mt-3 text-sm font-bold text-smeta-ink">
                  {searchQuery.trim() ? "Qidiruv bo'yicha so'rov topilmadi" : "Bu do'konga hali so'rov yuborilmagan"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-smeta-line">
                {filteredStoreInbox.slice(0, 6).map((item) => (
                  <div key={item.recipientId} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_160px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black">{item.publicCode}</span>
                        <StatusPill label={item.recipientStatus} />
                        <span className="rounded-full bg-smeta-soft px-2.5 py-1 text-xs font-bold text-smeta-mauve">{item.category}</span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-smeta-ink">{item.customerDisplay} · {item.region}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-smeta-mauve">{item.description || "Izoh kiritilmagan"}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs font-bold text-smeta-mauve">O'z taklifi</p>
                      <p className="mt-1 text-sm font-black">{item.offer ? formatMoney(item.offer.totalAmountUzs) : "Yuborilmagan"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <p className="mt-1 text-sm leading-6 text-smeta-mauve">Do'kon umumiy narx va yetkazish shartlarini shu yerda kiritadi.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="smeta-label">{isStoreSession ? "Sizning do'koningiz" : "Do'kon"}</span>
            {isStoreSession ? (
              <div className="smeta-input flex min-h-[46px] items-center font-bold">
                {ownStore ? ownStore.name : "Bu akkauntga do'kon biriktirilmagan"}
              </div>
            ) : (
              <select className="smeta-input" disabled={activeStores.length === 0} value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
                <option value="">{activeStores.length === 0 ? "Faol do'kon yo'q" : "Do'kon tanlang"}</option>
                {activeStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            )}
          </label>

          {selectedStore ? (
            <div className="rounded-2xl border border-smeta-line bg-smeta-soft px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-smeta-ink">{selectedStore.name}</p>
                  <p className="mt-1 text-xs font-semibold text-smeta-mauve">{selectedStore.ownerName || "Mas'ul kiritilmagan"} · {selectedStore.phone || "Telefon yo'q"}</p>
                </div>
                <StatusPill label={selectedStore.status} />
              </div>
              <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-2 xl:grid-cols-1">
                <CompatibilityPill label="Hudud" ok={selectedStoreMatchesRegion} requestValue={selectedRequest.region} storeValue={selectedStore.serviceRegions.join(", ")} />
                <CompatibilityPill label="Kategoriya" ok={selectedStoreMatchesCategory} requestValue={selectedRequest.category} storeValue={selectedStore.categories.join(", ")} />
              </div>
            </div>
          ) : null}

          {currentInboxItem ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-black">So'rov do'konga yuborilgan</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill label={currentInboxItem.recipientStatus} />
                    {currentInboxItem.offer ? <StatusPill label={currentInboxItem.offer.status} /> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-black">
                    {selectedStore
                      ? isStoreSession
                        ? "So'rov sizning do'koningizga yuborilmagan"
                        : "So'rov bu do'konga yuborilmagan"
                      : isStoreSession
                        ? "Do'koningiz topilmadi"
                        : "Taklif uchun do'kon tanlanmagan"}
                  </p>
                  <p className="mt-1 leading-5">
                    {selectedStore
                      ? isStoreSession
                        ? "Admin so'rovni sizning do'koningizga yuborgandan keyin narx kiritasiz."
                        : "Admin avval so'rovni mos do'konga yuborishi kerak. Shundan keyin narx kiritiladi."
                      : isStoreSession
                        ? "Bu Telegram akkauntga faol va tasdiqlangan do'kon biriktirilishi kerak."
                        : "Faol va tasdiqlangan do'kon bo'lsa, shu yerda tanlanadi."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <label className="block">
            <span className="smeta-label">Materiallar narxi, UZS</span>
            <input
              className="smeta-input"
              disabled={!currentInboxItem}
              inputMode="numeric"
              placeholder="Masalan: 23950000"
              value={materialSubtotal}
              onChange={(event) => setMaterialSubtotal(event.target.value.replace(/\D/g, ""))}
            />
          </label>

          <label className="block">
            <span className="smeta-label">Yetkazish haqi, UZS</span>
            <input
              className="smeta-input"
              disabled={!currentInboxItem}
              inputMode="numeric"
              placeholder="Masalan: 450000"
              value={deliveryFee}
              onChange={(event) => setDeliveryFee(event.target.value.replace(/\D/g, ""))}
            />
          </label>

          <div className="rounded-2xl border border-smeta-line bg-smeta-soft px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">Jami taklif summasi</p>
            <p className="mt-1 text-xl font-black">{formatMoney(finalTotalPreview)}</p>
          </div>

          <label className="block">
            <span className="smeta-label">Yetkazish muddati</span>
            <input className="smeta-input" disabled={!currentInboxItem} placeholder="Masalan: Bugun 18:00 gacha" value={deliveryEstimate} onChange={(event) => setDeliveryEstimate(event.target.value)} />
          </label>

          <label className="block">
            <span className="smeta-label">Taklif amal qilish vaqti, soat</span>
            <input className="smeta-input" disabled={!currentInboxItem} inputMode="numeric" value={validityHours} onChange={(event) => setValidityHours(event.target.value.replace(/\D/g, ""))} />
          </label>

          <label className="smeta-panel flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-bold">
            <input checked={completeListAvailable} className="h-4 w-4 accent-[rgb(var(--smeta-clay))]" disabled={!currentInboxItem} type="checkbox" onChange={(event) => setCompleteListAvailable(event.target.checked)} />
            <span>Ro'yxatdagi hamma mahsulot bor</span>
          </label>

          <label className="block">
            <span className="smeta-label">Izoh</span>
            <textarea
              className="smeta-input min-h-28 resize-none"
              disabled={!currentInboxItem}
              placeholder="Masalan: To'liq ro'yxat bo'yicha umumiy taklif"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="smeta-label">Rad etish yoki qaytarish sababi</span>
            <input className="smeta-input" value={actionReason} onChange={(event) => setActionReason(event.target.value)} />
          </label>
        </div>

        {currentInboxItem ? (
          <button className="smeta-primary-button mt-6 w-full" disabled={isSubmitting || !canCreateOffer} onClick={handleCreateOffer}>
            <Send className="h-4 w-4 shrink-0" />
            {isSubmitting ? "Saqlanmoqda..." : "Taklif yuborish"}
          </button>
        ) : (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">{isStoreSession ? "Hozircha taklif yuborib bo'lmaydi" : "Avval do'konni biriktiring"}</p>
                <p className="mt-1 leading-5">
                  {isStoreSession ? "Admin bu so'rovni sizning do'koningizga yuborgandan keyin narx kiritasiz." : "So'rov tanlangan do'konga yuborilgandan keyin taklif kiritiladi."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button className="smeta-ghost-button min-h-11 w-full" disabled={isSubmitting || !currentInboxItem || currentInboxItem.recipientStatus !== "assigned"} onClick={handleDeclineRequest}>
            <Ban className="h-4 w-4" />
            So'rovni rad etish
          </button>
          <button className="smeta-ghost-button min-h-11 w-full" disabled={isSubmitting || currentInboxItem?.offer?.status !== "submitted"} onClick={handleWithdrawOffer}>
            <RefreshCw className="h-4 w-4" />
            Taklifni qaytarish
          </button>
        </div>

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

function CompatibilityPill({ label, ok, requestValue, storeValue }: { label: string; ok: boolean; requestValue: string; storeValue: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
        <span>{label}: {ok ? "mos" : "mos emas"}</span>
      </div>
      <p className="mt-1 font-medium leading-5 opacity-80">So'rov: {requestValue}</p>
      <p className="font-medium leading-5 opacity-80">Do'kon: {storeValue || "kiritilmagan"}</p>
    </div>
  );
}

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
