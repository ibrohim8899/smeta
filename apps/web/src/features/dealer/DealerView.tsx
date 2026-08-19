import { useEffect, useMemo, useState } from "react";
import { APP_CURRENCY } from "@smeta/shared";
import { Copy, ExternalLink, Link2, RefreshCw, Send } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusPill } from "../../components/ui/StatusPill";
import { formatStatusLabel } from "../../lib/labels";
import { matchesSearch } from "../../lib/search";
import {
  fetchDealerRequests,
  fetchDealerSummary,
  fetchDealers,
  rotateDealerReferral,
  updateDealerStatus,
  type DealerRequestResponse,
  type DealerResponse,
  type DealerSummaryResponse
} from "../../lib/api";

type DealerViewProps = {
  searchQuery?: string;
};

export function DealerView({ searchQuery = "" }: DealerViewProps) {
  const [dealers, setDealers] = useState<DealerResponse[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [dealerRequests, setDealerRequests] = useState<DealerRequestResponse[]>([]);
  const [dealerSummary, setDealerSummary] = useState<DealerSummaryResponse | null>(null);
  const [busyDealerId, setBusyDealerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredDealers = useMemo(
    () =>
      dealers.filter((dealer) =>
        matchesSearch(searchQuery, [
          dealer.displayName,
          dealer.companyName,
          dealer.phone,
          dealer.region,
          dealer.referralCode,
          dealer.status,
          formatStatusLabel(dealer.status)
        ])
      ),
    [dealers, searchQuery]
  );
  const selectedDealer = useMemo(
    () => filteredDealers.find((dealer) => dealer.id === selectedDealerId) ?? filteredDealers[0] ?? null,
    [filteredDealers, selectedDealerId]
  );
  const filteredDealerRequests = useMemo(
    () =>
      dealerRequests.filter((request) =>
        matchesSearch(searchQuery, [
          request.publicCode,
          request.customerDisplay,
          request.region,
          request.category,
          request.status,
          request.businessStatus,
          formatStatusLabel(request.businessStatus)
        ])
      ),
    [dealerRequests, searchQuery]
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
    <div className="space-y-5">
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
                {filteredDealers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-smeta-mauve" colSpan={5}>
                      {searchQuery.trim() ? "Qidiruv bo'yicha usta topilmadi." : "Hali usta yo'q."}
                    </td>
                  </tr>
                ) : (
                  filteredDealers.map((dealer) => (
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
                {filteredDealerRequests.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-smeta-mauve" colSpan={5}>
                      {searchQuery.trim() ? "Qidiruv bo'yicha referral so'rov topilmadi." : "Bu ustaga hali request biriktirilmagan."}
                    </td>
                  </tr>
                ) : (
                  filteredDealerRequests.map((request) => (
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
    </div>
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
