import { useEffect, useMemo, useState } from "react";
import { APP_CURRENCY } from "@smeta/shared";
import { Receipt } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusPill } from "../../components/ui/StatusPill";
import {
  fetchFinanceLedger,
  fetchFinanceSummary,
  recordFinancePayment,
  type FinanceLedgerResponse,
  type FinanceSummaryResponse
} from "../../lib/api";

export function FinanceView() {
  const [ledger, setLedger] = useState<FinanceLedgerResponse[]>([]);
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("Do'kon komissiya qarzini to'ladi");
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLedger = useMemo(
    () => ledger.find((entry) => entry.id === selectedLedgerId) ?? ledger.find((entry) => entry.status !== "paid") ?? ledger[0] ?? null,
    [ledger, selectedLedgerId]
  );
  const remainingDebt = selectedLedger ? Math.max(selectedLedger.storeDebtUzs - selectedLedger.paidAmountUzs, 0) : 0;

  async function loadData() {
    try {
      const [ledgerResult, summaryResult] = await Promise.all([fetchFinanceLedger(), fetchFinanceSummary()]);
      setLedger(ledgerResult);
      setSummary(summaryResult);
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
    if (selectedLedger && !paymentAmount) {
      setPaymentAmount(String(Math.max(selectedLedger.storeDebtUzs - selectedLedger.paidAmountUzs, 0)));
    }
  }, [paymentAmount, selectedLedger]);

  async function handlePayment() {
    if (!selectedLedger || !paymentAmount) {
      return;
    }

    setIsPaying(true);
    setError(null);

    try {
      await recordFinancePayment(selectedLedger.id, Number(paymentAmount), paymentNote);
      setPaymentAmount("");
      await loadData();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "To'lov yozilmadi");
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Ledger yozuvlari" value={String(summary?.ledgerCount ?? 0)} note="Yakunlangan buyurtmalar" />
          <MetricCard label="Do'kon qarzi" value={formatCompact(summary?.storeDebtUzs ?? 0)} note={APP_CURRENCY} />
          <MetricCard label="Usta reward" value={formatCompact(summary?.dealerRewardUzs ?? 0)} note={APP_CURRENCY} />
          <MetricCard label="Platforma sof" value={formatCompact(summary?.platformNetUzs ?? 0)} note={APP_CURRENCY} />
        </div>

        <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Komissiya jurnali</h3>
              <p className="mt-1 text-sm text-smeta-mauve">
                Yakunlangan buyurtmadan komissiya, usta reward va platforma sof foydasi avtomatik hisoblanadi.
              </p>
            </div>
            <button className="rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold" onClick={() => void loadData()}>
              Yangilash
            </button>
          </div>

          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.12em] text-smeta-mauve">
                  <th className="border-b border-smeta-line px-3 py-3">ID</th>
                  <th className="border-b border-smeta-line px-3 py-3">Buyurtma</th>
                  <th className="border-b border-smeta-line px-3 py-3">Do'kon</th>
                  <th className="border-b border-smeta-line px-3 py-3">Asos</th>
                  <th className="border-b border-smeta-line px-3 py-3">Komissiya</th>
                  <th className="border-b border-smeta-line px-3 py-3">Usta reward</th>
                  <th className="border-b border-smeta-line px-3 py-3">Sof</th>
                  <th className="border-b border-smeta-line px-3 py-3">To'langan</th>
                  <th className="border-b border-smeta-line px-3 py-3">Holat</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td className="border-b border-smeta-line px-3 py-6 text-smeta-mauve" colSpan={9}>
                      Hali moliya yozuvi yo'q. Buyurtma `Yakunlash` bosilganda ledger avtomatik yaratiladi.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="border-b border-smeta-line px-3 py-4 font-semibold">{entry.publicCode}</td>
                      <td className="border-b border-smeta-line px-3 py-4">{entry.order.publicCode}</td>
                      <td className="border-b border-smeta-line px-3 py-4">{entry.store.name}</td>
                      <td className="border-b border-smeta-line px-3 py-4">{formatMoney(entry.baseAmountUzs)}</td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        {formatMoney(entry.platformCommissionUzs)}
                        <span className="block text-xs text-smeta-mauve">{formatRate(entry.storeCommissionRateBps)}</span>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        {formatMoney(entry.dealerRewardUzs)}
                        <span className="block text-xs text-smeta-mauve">{entry.dealerReferral || "Usta yo'q"}</span>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">{formatMoney(entry.platformNetUzs)}</td>
                      <td className="border-b border-smeta-line px-3 py-4">{formatMoney(entry.paidAmountUzs)}</td>
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

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-smeta-clay" />
          <h3 className="text-lg font-semibold">To'lov kiritish</h3>
        </div>

        {selectedLedger ? (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-smeta-mauve">Ledger</span>
              <select
                className="mt-1 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
                value={selectedLedger.id}
                onChange={(event) => {
                  setSelectedLedgerId(event.target.value);
                  setPaymentAmount("");
                }}
              >
                {ledger.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.publicCode} · {entry.store.name} · {formatMoney(Math.max(entry.storeDebtUzs - entry.paidAmountUzs, 0))}
                  </option>
                ))}
              </select>
            </label>

            <Info label="Qoldiq qarz" value={formatMoney(remainingDebt)} />
            <Info label="Buyurtma" value={selectedLedger.order.publicCode} />

            <label className="block">
              <span className="text-xs font-semibold text-smeta-mauve">To'lov summasi, UZS</span>
              <input
                className="mt-1 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
                inputMode="numeric"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value.replace(/\D/g, ""))}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-smeta-mauve">Izoh</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
              />
            </label>

            <button
              className="w-full rounded-md bg-smeta-clay px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPaying || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > remainingDebt}
              onClick={handlePayment}
            >
              {isPaying ? "Saqlanmoqda..." : "To'lovni yozish"}
            </button>
          </div>
        ) : (
          <p className="mt-5 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">
            To'lov kiritish uchun avval yakunlangan buyurtmadan ledger yozuvi yaratilishi kerak.
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

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} UZS`;
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("uz-UZ", { maximumFractionDigits: 1 })}M`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("uz-UZ")}K`;
  }

  return String(value);
}

function formatRate(rateBps: number) {
  return `${(rateBps / 100).toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}%`;
}
