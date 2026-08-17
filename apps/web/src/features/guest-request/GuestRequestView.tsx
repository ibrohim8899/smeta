import { useEffect, useState } from "react";
import { CheckCircle2, FileText, MessageSquareWarning, Phone, ShieldCheck, XCircle } from "lucide-react";
import {
  cancelGuestRequest,
  confirmGuestOrderDelivery,
  disputeGuestRequest,
  fetchGuestMaterialRequest,
  fetchGuestOffers,
  fetchGuestOrder,
  getGuestAttachmentDownloadUrl,
  selectGuestOffer,
  updateGuestContact,
  type GuestMaterialRequestResponse,
  type GuestStoreOfferResponse,
  type OrderResponse
} from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import { StatusPill } from "../../components/ui/StatusPill";

type GuestRequestViewProps = {
  token: string;
};

const TERMINAL_REQUEST_STATUSES = new Set(["completed", "canceled", "disputed", "expired"]);

export function GuestRequestView({ token }: GuestRequestViewProps) {
  const [request, setRequest] = useState<GuestMaterialRequestResponse | null>(null);
  const [offers, setOffers] = useState<GuestStoreOfferResponse[]>([]);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [confirmNote, setConfirmNote] = useState("");
  const [finalAmountUzs, setFinalAmountUzs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadAll() {
    try {
      setLoading(true);
      const [requestResult, offersResult, orderResult] = await Promise.all([
        fetchGuestMaterialRequest(token),
        fetchGuestOffers(token),
        fetchGuestOrder(token)
      ]);
      setRequest(requestResult);
      setOffers(offersResult);
      setOrder(orderResult);
      setContactPhone(requestResult.phone ?? "");
      setDeliveryNote(requestResult.deliveryNote ?? "");
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Secure link ochilmadi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [token]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    try {
      setActionLoading(true);
      setError(null);
      await action();
      setMessage(success);
      await loadAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Amal bajarilmadi");
    } finally {
      setActionLoading(false);
    }
  }

  const terminal = request ? TERMINAL_REQUEST_STATUSES.has(request.status) : true;
  const canConfirm = order?.status === "delivered_pending_confirmation";

  return (
    <main className="min-h-screen bg-smeta-paper px-4 py-6 text-smeta-ink sm:px-6">
      <section className="mx-auto max-w-5xl rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-smeta-soft text-smeta-clay">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Secure request status</h1>
            <p className="mt-1 text-sm leading-6 text-smeta-mauve">
              Bu link faqat sizning material so'rovingizni ochadi. Ichki admin, komissiya va boshqa do'kon ma'lumotlari ko'rsatilmaydi.
            </p>
          </div>
        </div>

        {loading ? <p className="mt-5 text-sm font-semibold text-smeta-mauve">Yuklanmoqda...</p> : null}
        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

        {request ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-smeta-line bg-smeta-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">So'rov raqami</p>
                  <p className="mt-1 text-2xl font-black">{request.publicCode}</p>
                </div>
                <StatusPill label={formatStatusLabel(request.status)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Mijoz" value={request.customerName} />
                <Info label="Hudud" value={request.region} />
                <Info label="Kategoriya" value={request.category} />
                <Info label="Dealer" value={request.dealer?.displayName ?? request.dealerReferral ?? "Referral yo'q"} />
              </div>

              {request.description ? <TextPanel label="Izoh" value={request.description} /> : null}
              {request.deliveryNote ? <TextPanel label="Yetkazish izohi" value={request.deliveryNote} /> : null}

              <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-4">
                <h2 className="text-base font-bold">Fayllar</h2>
                <div className="mt-3 space-y-2">
                  {request.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-smeta-line bg-smeta-soft px-3 py-3 text-sm font-semibold"
                      href={getGuestAttachmentDownloadUrl(token, attachment.id)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-smeta-clay" />
                        <span className="truncate">{attachment.fileName}</span>
                      </span>
                      <span className="text-xs text-smeta-mauve">{attachment.scanStatus}</span>
                    </a>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold">Do'kon takliflari</h2>
                  <span className="text-xs font-bold text-smeta-mauve">{offers.length} ta</span>
                </div>
                <div className="mt-3 space-y-3">
                  {offers.length === 0 ? (
                    <p className="rounded-xl border border-smeta-line bg-smeta-soft px-4 py-3 text-sm font-semibold text-smeta-mauve">
                      Hozircha faol taklif yo'q.
                    </p>
                  ) : (
                    offers.map((offer) => (
                      <div key={offer.id} className="rounded-xl border border-smeta-line bg-smeta-soft px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black">{offer.store.name}</p>
                            <p className="mt-1 text-xs font-semibold text-smeta-mauve">
                              Material: {formatMoney(offer.materialSubtotalUzs)} UZS / yetkazish: {formatMoney(offer.deliveryFeeUzs)} UZS
                            </p>
                            <p className="mt-1 text-xs font-semibold text-smeta-mauve">
                              {offer.deliveryEstimate ?? "Muddat ko'rsatilmagan"} / amal qilish: {offer.validityHours} soat
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-black">{formatMoney(offer.finalTotalUzs)} UZS</p>
                            <StatusPill label={formatStatusLabel(offer.status)} />
                          </div>
                        </div>
                        {offer.note ? <p className="mt-3 text-sm font-semibold text-smeta-ink">{offer.note}</p> : null}
                        {!order && offer.status === "submitted" ? (
                          <button
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-smeta-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                            disabled={actionLoading || request.phoneRequiredBeforeSelection}
                            onClick={() => runAction(() => selectGuestOffer(token, offer.id), "Taklif tanlandi, buyurtma yaratildi")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Tanlash
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-smeta-line bg-smeta-soft p-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-smeta-clay" />
                  <h2 className="text-base font-bold">Kontakt</h2>
                </div>
                <div className="mt-3 space-y-3">
                  <input className="w-full rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold" placeholder="+998..." value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold"
                    placeholder="Yetkazish izohi"
                    value={deliveryNote}
                    onChange={(event) => setDeliveryNote(event.target.value)}
                  />
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-smeta-clay px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    disabled={actionLoading}
                    onClick={() => runAction(() => updateGuestContact(token, { deliveryNote, phone: contactPhone }), "Kontakt saqlandi")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Saqlash
                  </button>
                  {request.phoneRequiredBeforeSelection ? <p className="text-xs font-semibold text-smeta-mauve">Taklif tanlashdan oldin telefon majburiy.</p> : null}
                </div>
              </section>

              <section className="rounded-2xl border border-smeta-line bg-smeta-soft p-4">
                <h2 className="text-base font-bold">Buyurtma</h2>
                {order ? (
                  <div className="mt-3 space-y-2 text-sm font-semibold">
                    <Info label="Raqam" value={order.publicCode} />
                    <Info label="Do'kon" value={order.store.name} />
                    <Info label="Holat" value={formatStatusLabel(order.status)} />
                    <Info label="Yakuniy summa" value={`${formatMoney(order.finalAmountUzs)} UZS`} />
                    {order.deliveryProofNote ? <TextPanel label="Yetkazish isboti" value={order.deliveryProofNote} /> : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-smeta-mauve">Buyurtma hali yaratilmagan.</p>
                )}
                {canConfirm ? (
                  <div className="mt-3 space-y-3">
                    <input className="w-full rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold" placeholder="Yakuniy summa" value={finalAmountUzs} onChange={(event) => setFinalAmountUzs(event.target.value)} />
                    <textarea className="min-h-20 w-full rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold" placeholder="Tasdiq izohi" value={confirmNote} onChange={(event) => setConfirmNote(event.target.value)} />
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      disabled={actionLoading}
                      onClick={() =>
                        runAction(
                          () =>
                            confirmGuestOrderDelivery(token, order.id, {
                              finalAmountUzs: finalAmountUzs ? Number(finalAmountUzs) : undefined,
                              note: confirmNote
                            }),
                          "Yetkazish tasdiqlandi"
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Yetkazildi deb tasdiqlash
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-smeta-line bg-smeta-soft p-4">
                <div className="flex items-center gap-2">
                  <MessageSquareWarning className="h-4 w-4 text-smeta-clay" />
                  <h2 className="text-base font-bold">Amallar</h2>
                </div>
                <textarea
                  className="mt-3 min-h-24 w-full rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold"
                  placeholder="Sabab yoki izoh"
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
                    disabled={actionLoading || terminal}
                    onClick={() => runAction(() => cancelGuestRequest(token, actionReason), "So'rov bekor qilindi")}
                  >
                    <XCircle className="h-4 w-4" />
                    Bekor qilish
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-700 disabled:opacity-50"
                    disabled={actionLoading || terminal || !actionReason.trim()}
                    onClick={() => runAction(() => disputeGuestRequest(token, actionReason), "Nizo ochildi")}
                  >
                    <MessageSquareWarning className="h-4 w-4" />
                    Nizo ochish
                  </button>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-smeta-line bg-white px-4 py-3">
      <p className="text-xs font-semibold text-smeta-mauve">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function TextPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-smeta-line bg-smeta-soft px-4 py-3">
      <p className="text-xs font-semibold text-smeta-mauve">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("uz-UZ");
}
