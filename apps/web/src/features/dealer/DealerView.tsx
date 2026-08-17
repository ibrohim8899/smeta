import { useEffect, useMemo, useState } from "react";
import { APP_CURRENCY } from "@smeta/shared";
import { Copy, ExternalLink, Link2, RefreshCw, Send, ShieldCheck, UserRoundPlus } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusPill } from "../../components/ui/StatusPill";
import {
  createDealer,
  fetchDealerRequests,
  fetchDealerSummary,
  fetchDealers,
  rotateDealerReferral,
  updateDealerStatus,
  type DealerRequestResponse,
  type DealerResponse,
  type DealerSummaryResponse
} from "../../lib/api";

export function DealerView() {
  const [dealers, setDealers] = useState<DealerResponse[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [dealerRequests, setDealerRequests] = useState<DealerRequestResponse[]>([]);
  const [dealerSummary, setDealerSummary] = useState<DealerSummaryResponse | null>(null);
  const [displayName, setDisplayName] = useState("Usta Sardor");
  const [phone, setPhone] = useState("+998 93 222 33 44");
  const [region, setRegion] = useState("Namangan sh.");
  const [companyName, setCompanyName] = useState("Sardor qurilish guruhi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyDealerId, setBusyDealerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedDealer = useMemo(
    () => dealers.find((dealer) => dealer.id === selectedDealerId) ?? dealers[0] ?? null,
    [dealers, selectedDealerId]
  );
  const approvedCount = useMemo(() => dealers.filter((dealer) => dealer.status === "approved").length, [dealers]);
  const pendingCount = useMemo(() => dealers.filter((dealer) => dealer.status === "pending").length, [dealers]);
  const activeReferralCount = useMemo(() => dealers.filter((dealer) => dealer.referralActive).length, [dealers]);

  async function loadDealers() {
    try {
      const result = await fetchDealers();
      setDealers(result);
      setSelectedDealerId((currentId) => {
        if (currentId && result.some((dealer) => dealer.id === currentId)) {
          return currentId;
        }

        return result[0]?.id ?? "";
      });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ustalar yuklanmadi");
    }
  }

  async function loadDealerDetails(dealerId: string) {
    if (!dealerId) {
      setDealerRequests([]);
      setDealerSummary(null);
      return;
    }

    try {
      const [requestsResult, summaryResult] = await Promise.all([
        fetchDealerRequests(dealerId),
        fetchDealerSummary(dealerId)
      ]);
      setDealerRequests(requestsResult);
      setDealerSummary(summaryResult);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Usta ma'lumotlari yuklanmadi");
    }
  }

  useEffect(() => {
    void loadDealers();
  }, []);

  useEffect(() => {
    void loadDealerDetails(selectedDealer?.id ?? "");
  }, [selectedDealer?.id]);

  async function handleCreateDealer() {
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createDealer({
        companyName,
        displayName,
        phone,
        region
      });
      await loadDealers();
      setSelectedDealerId(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Usta arizasi yaratilmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatus(dealer: DealerResponse, status: "approved" | "suspended" | "rejected") {
    setBusyDealerId(dealer.id);
    setError(null);

    try {
      await updateDealerStatus(dealer.id, {
        adminNote:
          status === "approved"
            ? "Admin ustani tasdiqladi"
            : status === "suspended"
              ? "Admin ustani vaqtincha to'xtatdi"
              : "Admin arizani rad etdi",
        referralActive: status === "approved",
        status
      });
      await loadDealers();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Usta statusi o'zgarmadi");
    } finally {
      setBusyDealerId(null);
    }
  }

  async function handleRotateReferral(dealer: DealerResponse) {
    setBusyDealerId(dealer.id);
    setError(null);

    try {
      const rotated = await rotateDealerReferral(dealer.id);
      await loadDealers();
      setSelectedDealerId(rotated.id);
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : "Referral kodi yangilanmadi");
    } finally {
      setBusyDealerId(null);
    }
  }

  async function copyReferralLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Tasdiqlangan ustalar" value={String(approvedCount)} note="Referral ishlaydi" />
          <MetricCard label="Kutilayotgan ariza" value={String(pendingCount)} note="Admin tekshiradi" />
          <MetricCard label="Aktiv referral" value={String(activeReferralCount)} note={APP_CURRENCY} />
        </div>

        {selectedDealer ? (
          <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">Dealer referral panel</p>
                <h3 className="mt-1 text-2xl font-black">{selectedDealer.displayName}</h3>
                <p className="mt-1 text-sm font-semibold text-smeta-mauve">
                  {selectedDealer.companyName || selectedDealer.phone || "Qo'shimcha ma'lumot yo'q"} - {selectedDealer.region}
                </p>
              </div>
              <StatusPill label={selectedDealer.status} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Info label="Referral kodi" value={selectedDealer.referralCode} />
              <Info label="Requestlar" value={String(dealerSummary?.referredRequestCount ?? 0)} />
              <Info label="Tanlangan" value={String(dealerSummary?.selectedCount ?? 0)} />
              <Info label="Konversiya" value={`${dealerSummary?.conversionRate ?? 0}%`} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px]">
              <div className="rounded-2xl border border-smeta-line bg-smeta-soft p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">Share tools</p>
                <a className="mt-2 block break-all text-sm font-bold text-smeta-clay" href={selectedDealer.referralLink}>
                  {selectedDealer.referralLink}
                </a>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="smeta-primary-button" onClick={() => void copyReferralLink(selectedDealer.referralLink)}>
                    <Copy className="h-4 w-4" />
                    {copied ? "Nusxalandi" : "Link copy"}
                  </button>
                  <a className="inline-flex items-center gap-2 rounded-xl border border-smeta-line px-4 py-2 text-sm font-bold" href={selectedDealer.telegramShareUrl}>
                    <Send className="h-4 w-4 text-smeta-clay" />
                    Telegram share
                  </a>
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-smeta-line px-4 py-2 text-sm font-bold disabled:opacity-60"
                    disabled={Boolean(busyDealerId) || selectedDealer.status !== "approved"}
                    onClick={() => void handleRotateReferral(selectedDealer)}
                  >
                    <RefreshCw className="h-4 w-4 text-smeta-clay" />
                    Rotate
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-smeta-line bg-smeta-soft p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">QR payload</p>
                <div className="mt-3 grid aspect-square place-items-center rounded-xl border border-smeta-line bg-smeta-surface p-4 text-center">
                  <Link2 className="h-8 w-8 text-smeta-clay" />
                  <p className="mt-2 break-all text-xs font-bold text-smeta-mauve">{selectedDealer.qrPayload}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ustalar va referral kodlar</h3>
              <p className="mt-1 text-sm text-smeta-mauve">
                Request yaratilganda attribution snapshot qilinadi. Dealer narxlarni ko'rmaydi.
              </p>
            </div>
            <button className="rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold" onClick={() => void loadDealers()}>
              Yangilash
            </button>
          </div>

          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="mt-5 overflow-x-auto">
            <table className="smeta-table min-w-[940px] text-sm">
              <thead>
                <tr>
                  <th>Usta</th>
                  <th>Hudud</th>
                  <th>Referral</th>
                  <th>Holat</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {dealers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-smeta-mauve" colSpan={5}>
                      Hali usta yo'q.
                    </td>
                  </tr>
                ) : (
                  dealers.map((dealer) => (
                    <tr key={dealer.id}>
                      <td>
                        <button className="text-left" onClick={() => setSelectedDealerId(dealer.id)}>
                          <p className="font-semibold">{dealer.displayName}</p>
                          <p className="text-xs text-smeta-mauve">{dealer.companyName || dealer.phone || "Qo'shimcha ma'lumot yo'q"}</p>
                        </button>
                      </td>
                      <td>{dealer.region}</td>
                      <td className="font-semibold">{dealer.referralCode}</td>
                      <td>
                        <StatusPill label={dealer.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md border border-smeta-line px-2 py-1 text-xs font-semibold disabled:opacity-60"
                            disabled={Boolean(busyDealerId)}
                            onClick={() => void handleStatus(dealer, "approved")}
                          >
                            Tasdiqlash
                          </button>
                          <button
                            className="rounded-md border border-smeta-line px-2 py-1 text-xs font-semibold disabled:opacity-60"
                            disabled={Boolean(busyDealerId)}
                            onClick={() => void handleStatus(dealer, "suspended")}
                          >
                            To'xtatish
                          </button>
                          <a className="rounded-md border border-smeta-line px-2 py-1 text-xs font-semibold" href={dealer.referralLink}>
                            <ExternalLink className="inline h-3 w-3" /> Link
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
          <h3 className="text-lg font-semibold">Attribution requestlari</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="smeta-table min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Mijoz</th>
                  <th>Hudud</th>
                  <th>Kategoriya</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {dealerRequests.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-smeta-mauve" colSpan={5}>
                      Bu ustaga hali request biriktirilmagan.
                    </td>
                  </tr>
                ) : (
                  dealerRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="font-semibold">{request.publicCode}</td>
                      <td>{request.customerDisplay}</td>
                      <td>{request.region}</td>
                      <td>{request.category}</td>
                      <td>
                        <StatusPill label={request.businessStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="h-fit rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta xl:sticky xl:top-24">
        <div className="flex items-center gap-2">
          <UserRoundPlus className="h-5 w-5 text-smeta-clay" />
          <h3 className="text-lg font-semibold">Usta arizasi</h3>
        </div>

        <div className="mt-5 space-y-3">
          <Field label="Ism" value={displayName} onChange={setDisplayName} />
          <Field label="Telefon" value={phone} onChange={setPhone} />
          <Field label="Hudud" value={region} onChange={setRegion} />
          <Field label="Brigada/kompaniya" value={companyName} onChange={setCompanyName} />
        </div>

        <button
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-smeta-clay px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !displayName || !region}
          onClick={handleCreateDealer}
        >
          <ShieldCheck className="h-4 w-4" />
          {isSubmitting ? "Saqlanmoqda..." : "Ariza yaratish"}
        </button>

        <div className="mt-5 grid gap-3">
          <Info label="Approved earning" value={formatMoney(dealerSummary?.approvedEarningsUzs ?? 0)} />
          <Info label="Payable" value={formatMoney(dealerSummary?.payableEarningsUzs ?? 0)} />
          <Info label="Paid" value={formatMoney(dealerSummary?.paidEarningsUzs ?? 0)} />
        </div>

        <p className="mt-4 rounded-xl bg-smeta-soft px-3 py-3 text-sm leading-6 text-smeta-mauve">
          Productionda ariza Telegram botdan boshlanadi. Bu panel V1 admin/dealer operatsiyalarini tekshirish uchun real backendga ulangan.
        </p>
      </section>
    </div>
  );
}

function Field({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-smeta-mauve">{label}</span>
      <input
        className="mt-1 w-full rounded-xl border border-smeta-line bg-smeta-surface px-3 py-2 text-sm font-medium outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-smeta-line bg-smeta-soft px-3 py-3">
      <p className="text-xs font-semibold text-smeta-mauve">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} UZS`;
}
