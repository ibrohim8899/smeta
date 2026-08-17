import { APP_CURRENCY } from "@smeta/shared";
import { useEffect, useState } from "react";
import { MetricCard } from "../../components/ui/MetricCard";
import { RequestDetails } from "../../components/ui/RequestDetails";
import { RequestRow } from "../../components/ui/RequestRow";
import { StatusPill } from "../../components/ui/StatusPill";
import { fetchFinanceLedger, fetchFinanceSummary, type FinanceLedgerResponse, type FinanceSummaryResponse } from "../../lib/api";
import type { RequestSummary } from "../../types/domain";

type DashboardViewProps = {
  onOpenAdmin: () => void;
  requests: RequestSummary[];
  requestsError: string | null;
  selectedRequest?: RequestSummary;
};

export function DashboardView({ onOpenAdmin, requests, requestsError, selectedRequest }: DashboardViewProps) {
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryResponse | null>(null);
  const [financeLedger, setFinanceLedger] = useState<FinanceLedgerResponse[]>([]);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const underReviewCount = requests.filter((request) => request.status === "submitted" || request.status === "under_review").length;

  async function loadFinanceData() {
    try {
      const [summary, ledger] = await Promise.all([fetchFinanceSummary(), fetchFinanceLedger()]);
      setFinanceSummary(summary);
      setFinanceLedger(ledger);
      setFinanceError(null);
    } catch (error) {
      setFinanceError(error instanceof Error ? error.message : "Moliya ma'lumotlarini yuklab bo'lmadi");
    }
  }

  useEffect(() => {
    void loadFinanceData();
  }, []);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Aktiv so'rov" value={String(requests.length)} note="Real baza" />
          <MetricCard label="Admin tekshiruv" value={String(underReviewCount)} note="Yuborilgan/tekshiruvda" />
          <MetricCard label="Do'kon qarzi" value={formatCompactUzs(financeSummary?.storeDebtUzs ?? 0)} note={APP_CURRENCY} />
          <MetricCard label="Ustaga to'lov" value={formatCompactUzs(financeSummary?.dealerRewardUzs ?? 0)} note={APP_CURRENCY} />
        </section>

        <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-4 shadow-smeta">
          <h3 className="text-lg font-semibold">Tanlangan so'rov</h3>
          {selectedRequest ? (
            <RequestDetails request={selectedRequest} />
          ) : (
            <p className="mt-4 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">Hali tanlanadigan so'rov yo'q.</p>
          )}
        </section>

        <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-4 shadow-smeta">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Pul oqimi</h3>
            <button className="rounded-xl border border-smeta-line px-3 py-2 text-xs font-semibold text-smeta-ink" onClick={() => void loadFinanceData()}>
              Yangilash
            </button>
          </div>
          {financeError ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{financeError}</p> : null}
          <div className="mt-4 space-y-3">
            {financeLedger.length === 0 ? <p className="text-sm text-smeta-mauve">Hali moliya yozuvi yo'q.</p> : null}
            {financeLedger.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-smeta-line bg-smeta-soft px-3 py-3">
                <div>
                  <p className="text-sm font-semibold">{entry.store.name}</p>
                  <p className="text-xs text-smeta-mauve">
                    {entry.publicCode} · Sof {entry.platformNetUzs.toLocaleString("uz-UZ")} UZS
                  </p>
                </div>
                <StatusPill label={entry.status} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-4 shadow-smeta">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Bugungi oqim</h3>
          <button className="rounded-xl bg-smeta-deep px-3 py-2 text-sm font-semibold text-white shadow-smeta-soft" onClick={onOpenAdmin}>
            Admin navbati
          </button>
        </div>
        {requestsError ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{requestsError}</p> : null}
        <div className="mt-5 space-y-3">
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </div>
      </section>
    </div>
  );
}

function formatCompactUzs(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("uz-UZ", { maximumFractionDigits: 1 })} million`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("uz-UZ")} ming`;
  }

  return String(value);
}
