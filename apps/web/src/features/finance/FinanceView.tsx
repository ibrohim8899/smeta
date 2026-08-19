import { useEffect, useMemo, useState } from "react";
import { APP_CURRENCY } from "@smeta/shared";
import { Banknote, Receipt, RotateCcw } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusPill } from "../../components/ui/StatusPill";
import {
  createFinancePayout,
  fetchDealerStatement,
  fetchFinanceLedger,
  fetchFinancePayouts,
  fetchFinanceSummary,
  fetchStoreStatement,
  recordFinanceAdjustment,
  recordFinancePayment,
  updateFinancePayoutStatus,
  type DealerStatementResponse,
  type FinanceLedgerResponse,
  type FinancePayoutResponse,
  type FinanceSummaryResponse,
  type StoreStatementResponse
} from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import { matchesSearch } from "../../lib/search";

type FinanceViewProps = {
  searchQuery?: string;
};

export function FinanceView({ searchQuery = "" }: FinanceViewProps) {
  const [ledger, setLedger] = useState<FinanceLedgerResponse[]>([]);
  const [payouts, setPayouts] = useState<FinancePayoutResponse[]>([]);
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("Do'kon komissiya qarzini to'ladi");
  const [paymentReference, setPaymentReference] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutReference, setPayoutReference] = useState("");
  const [dealerStatement, setDealerStatement] = useState<DealerStatementResponse | null>(null);
  const [storeStatement, setStoreStatement] = useState<StoreStatementResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredLedger = useMemo(
    () =>
      ledger.filter((entry) =>
        matchesSearch(searchQuery, [
          entry.publicCode,
          entry.order.publicCode,
          entry.store.name,
          entry.dealerReferral,
          entry.status,
          formatStatusLabel(entry.status),
          entry.agingBucket,
          agingLabel(entry.agingBucket),
          entry.baseAmountUzs,
          entry.storeDebtUzs,
          entry.remainingDebtUzs,
          entry.paidAmountUzs,
          entry.dealerRewardUzs
        ])
      ),
    [ledger, searchQuery]
  );
  const filteredPayouts = useMemo(
    () =>
      payouts.filter((payout) =>
        matchesSearch(searchQuery, [payout.publicCode, payout.dealerName, payout.dealerId, payout.amountUzs, payout.status, formatStatusLabel(payout.status), payout.reference])
      ),
    [payouts, searchQuery]
  );
  const selectedLedger = useMemo(
    () => filteredLedger.find((entry) => entry.id === selectedLedgerId) ?? filteredLedger.find((entry) => entry.status !== "paid") ?? filteredLedger[0] ?? null,
    [filteredLedger, selectedLedgerId]
  );
  const selectedDealerId = selectedLedger?.dealerId ?? "";
  const remainingDebt = selectedLedger ? selectedLedger.remainingDebtUzs : 0;
  const canCreatePayout = Boolean(dealerStatement && selectedDealerId && Number(payoutAmount) > 0 && Number(payoutAmount) <= dealerStatement.remainingPayableUzs);

  async function loadData() {
    try {
      const [ledgerResult, summaryResult, payoutResult] = await Promise.all([fetchFinanceLedger(), fetchFinanceSummary(), fetchFinancePayouts()]);
      setLedger(ledgerResult);
      setSummary(summaryResult);
      setPayouts(payoutResult);
      setSelectedLedgerId((currentId) => {
        if (currentId && ledgerResult.some((entry) => entry.id === currentId)) {
          return currentId;
        }

        return ledgerResult.find((entry) => entry.status !== "paid")?.id ?? ledgerResult[0]?.id ?? "";
      });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Moliya ma'lumotlari yuklanmadi");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedLedger) {
      setDealerStatement(null);
      setStoreStatement(null);
      return;
    }

    setPaymentAmount(String(Math.max(selectedLedger.remainingDebtUzs, 0)));
    setAdjustmentAmount("");
    setAdjustmentReason("");
    void loadStatements(selectedLedger);
  }, [selectedLedger?.id]);

  async function loadStatements(entry: FinanceLedgerResponse) {
    const [storeResult, dealerResult] = await Promise.all([
      fetchStoreStatement(entry.store.id),
      entry.dealerId ? fetchDealerStatement(entry.dealerId) : Promise.resolve(null)
    ]);
    setStoreStatement(storeResult);
    setDealerStatement(dealerResult);
    setPayoutAmount(dealerResult ? String(dealerResult.remainingPayableUzs) : "");
  }

  async function runAction(action: () => Promise<unknown>) {
    try {
      setBusy(true);
      setError(null);
      await action();
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Amal bajarilmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Ledger" value={String(summary?.ledgerCount ?? 0)} note="Yakunlangan orderlar" />
          <MetricCard label="Qoldiq qarz" value={formatCompact(summary?.remainingDebtUzs ?? 0)} note={APP_CURRENCY} />
          <MetricCard label="Overdue" value={formatCompact(summary?.overdueDebtUzs ?? 0)} note={APP_CURRENCY} />
          <MetricCard label="Usta payable" value={formatCompact(summary?.dealerPayableUzs ?? 0)} note={APP_CURRENCY} />
          <MetricCard label="Platforma sof" value={formatCompact(summary?.platformNetUzs ?? 0)} note={APP_CURRENCY} />
        </div>

        <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Komissiya jurnali</h3>
              <p className="mt-1 text-sm text-smeta-mauve">Debt aging, proof, adjustment va dealer payout V1 finance nazorati.</p>
            </div>
            <button className="rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold" onClick={() => void loadData()}>
              Yangilash
            </button>
          </div>

          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.12em] text-smeta-mauve">
                  <th className="border-b border-smeta-line px-3 py-3">ID</th>
                  <th className="border-b border-smeta-line px-3 py-3">Order</th>
                  <th className="border-b border-smeta-line px-3 py-3">Store</th>
                  <th className="border-b border-smeta-line px-3 py-3">Base</th>
                  <th className="border-b border-smeta-line px-3 py-3">Debt</th>
                  <th className="border-b border-smeta-line px-3 py-3">Paid</th>
                  <th className="border-b border-smeta-line px-3 py-3">Dealer</th>
                  <th className="border-b border-smeta-line px-3 py-3">Due</th>
                  <th className="border-b border-smeta-line px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td className="border-b border-smeta-line px-3 py-6 text-smeta-mauve" colSpan={9}>
                      {searchQuery.trim() ? "Qidiruv bo'yicha moliya yozuvi topilmadi." : "Hali moliya yozuvi yo'q."}
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((entry) => (
                    <tr key={entry.id} className={selectedLedgerId === entry.id ? "bg-smeta-soft" : undefined}>
                      <td className="border-b border-smeta-line px-3 py-4">
                        <button className="text-left font-bold text-smeta-clay" onClick={() => setSelectedLedgerId(entry.id)}>
                          {entry.publicCode}
                        </button>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">{entry.order.publicCode}</td>
                      <td className="border-b border-smeta-line px-3 py-4">{entry.store.name}</td>
                      <td className="border-b border-smeta-line px-3 py-4">{formatMoney(entry.baseAmountUzs)}</td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        {formatMoney(entry.storeDebtUzs)}
                        <span className="block text-xs text-smeta-mauve">Qoldiq: {formatMoney(entry.remainingDebtUzs)}</span>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">{formatMoney(entry.paidAmountUzs)}</td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        {formatMoney(entry.dealerRewardUzs)}
                        <span className="block text-xs text-smeta-mauve">{entry.dealerReferral || "Usta yo'q"}</span>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        {entry.dueAt ? new Date(entry.dueAt).toLocaleDateString("uz-UZ") : "-"}
                        <span className="block text-xs text-smeta-mauve">{agingLabel(entry.agingBucket)}</span>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        <StatusPill label={entry.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-smeta-clay" />
            <h3 className="text-lg font-semibold">Payment va adjustment</h3>
          </div>

          {selectedLedger ? (
            <div className="mt-5 space-y-3">
              <Info label="Ledger" value={`${selectedLedger.publicCode} / ${selectedLedger.store.name}`} />
              <Info label="Qoldiq qarz" value={formatMoney(remainingDebt)} />
              <input className="w-full rounded-md border border-smeta-line px-3 py-2 text-sm" inputMode="numeric" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value.replace(/\D/g, ""))} />
              <input className="w-full rounded-md border border-smeta-line px-3 py-2 text-sm" placeholder="Reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
              <textarea className="min-h-20 w-full rounded-md border border-smeta-line px-3 py-2 text-sm" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
              <button
                className="w-full rounded-md bg-smeta-clay px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                disabled={busy || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > remainingDebt}
                onClick={() => runAction(() => recordFinancePayment(selectedLedger.id, Number(paymentAmount), paymentNote, { reference: paymentReference, method: "bank" }))}
              >
                To'lovni yozish
              </button>

              <div className="rounded-md border border-smeta-line bg-smeta-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-smeta-mauve">Adjustment / waiver</p>
                <input className="mt-3 w-full rounded-md border border-smeta-line px-3 py-2 text-sm" inputMode="numeric" placeholder="-50000 yoki 50000" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value.replace(/[^\d-]/g, ""))} />
                <textarea className="mt-2 min-h-16 w-full rounded-md border border-smeta-line px-3 py-2 text-sm" placeholder="Sabab" value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} />
                <button
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-smeta-line bg-white px-4 py-2 text-sm font-bold disabled:opacity-60"
                  disabled={busy || !adjustmentAmount || !adjustmentReason.trim()}
                  onClick={() => runAction(() => recordFinanceAdjustment(selectedLedger.id, { amountUzs: Number(adjustmentAmount), reason: adjustmentReason, type: Number(adjustmentAmount) < 0 ? "waiver" : "adjustment" }))}
                >
                  <RotateCcw className="h-4 w-4" />
                  Adjustment yozish
                </button>
              </div>

              <History title="Payments" rows={selectedLedger.payments.map((item) => `${formatMoney(item.amountUzs)} / ${item.reference || item.note || "-"}`)} />
              <History title="Adjustments" rows={selectedLedger.adjustments.map((item) => `${formatMoney(item.amountUzs)} / ${item.type} / ${item.reason || "-"}`)} />
            </div>
          ) : (
            <p className="mt-5 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">Ledger tanlang.</p>
          )}
        </section>

        <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-smeta-clay" />
            <h3 className="text-lg font-semibold">Dealer payout</h3>
          </div>

          {dealerStatement ? (
            <div className="mt-5 space-y-3">
              <Info label="Payable qoldiq" value={formatMoney(dealerStatement.remainingPayableUzs)} />
              <Info label="Paid payout" value={formatMoney(dealerStatement.paidPayoutUzs)} />
              <input className="w-full rounded-md border border-smeta-line px-3 py-2 text-sm" inputMode="numeric" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value.replace(/\D/g, ""))} />
              <input className="w-full rounded-md border border-smeta-line px-3 py-2 text-sm" placeholder="Payout reference" value={payoutReference} onChange={(event) => setPayoutReference(event.target.value)} />
              <button
                className="w-full rounded-md bg-smeta-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                disabled={busy || !canCreatePayout}
                onClick={() => runAction(() => createFinancePayout({ amountUzs: Number(payoutAmount), dealerId: selectedDealerId, method: "bank", reference: payoutReference, note: "Dealer payout" }))}
              >
                Payout yaratish
              </button>
            </div>
          ) : (
            <p className="mt-5 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">Tanlangan ledgerda dealer yo'q.</p>
          )}

          <div className="mt-4 space-y-2">
            {filteredPayouts.slice(0, 6).map((payout) => (
              <div key={payout.id} className="rounded-md border border-smeta-line px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{payout.publicCode}</p>
                  <StatusPill label={payout.status} />
                </div>
                <p className="mt-1 text-xs font-semibold text-smeta-mauve">
                  {payout.dealerName || payout.dealerId} / {formatMoney(payout.amountUzs)}
                </p>
                {payout.status === "approved" ? (
                  <button className="mt-2 rounded-md border border-smeta-line px-3 py-1 text-xs font-bold" disabled={busy} onClick={() => runAction(() => updateFinancePayoutStatus(payout.id, { status: "paid", reference: payout.reference ?? payoutReference, note: "Paid" }))}>
                    Paid qilish
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {storeStatement ? (
          <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Store statement</h3>
            <div className="mt-3 grid gap-2">
              <Info label="Jami debt" value={formatMoney(storeStatement.storeDebtUzs)} />
              <Info label="Qoldiq" value={formatMoney(storeStatement.remainingDebtUzs)} />
              <Info label="Overdue" value={formatMoney(storeStatement.overdueDebtUzs)} />
            </div>
          </section>
        ) : null}
      </aside>
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

function History({ rows, title }: { rows: string[]; title: string }) {
  return (
    <div className="rounded-md border border-smeta-line bg-smeta-paper p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-smeta-mauve">{title}</p>
      {rows.length === 0 ? <p className="mt-2 text-sm text-smeta-mauve">Hali yozuv yo'q.</p> : rows.map((row) => <p key={row} className="mt-2 rounded-md bg-white px-3 py-2 text-xs font-semibold">{row}</p>)}
    </div>
  );
}

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} UZS`;
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("uz-UZ", { maximumFractionDigits: 1 })} million`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("uz-UZ")} ming`;
  }

  return String(value);
}

function agingLabel(bucket: FinanceLedgerResponse["agingBucket"]) {
  const labels: Record<FinanceLedgerResponse["agingBucket"], string> = {
    current: "Muddatida",
    overdue_1_7: "1-7 kun kechikkan",
    overdue_8_30: "8-30 kun kechikkan",
    overdue_31_plus: "31+ kun kechikkan",
    paid: "Yopilgan"
  };

  return labels[bucket];
}
