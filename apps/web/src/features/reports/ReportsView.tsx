import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, ShieldAlert } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusPill } from "../../components/ui/StatusPill";
import { downloadV1ReportCsv, fetchV1ReportSummary, resolveMaterialRequestDispute, resolveOrderDispute, type V1ReportSummaryResponse } from "../../lib/api";

export function ReportsView() {
  const [report, setReport] = useState<V1ReportSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolveReason, setResolveReason] = useState("Admin resolve");
  const [busy, setBusy] = useState(false);

  const requestStatusRows = useMemo(() => Object.entries(report?.requestStatusCounts ?? {}), [report]);
  const orderStatusRows = useMemo(() => Object.entries(report?.orderStatusCounts ?? {}), [report]);

  async function loadReport() {
    setBusy(true);
    setError(null);

    try {
      setReport(await fetchV1ReportSummary());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Hisobot yuklanmadi");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  async function handleDownloadCsv() {
    setBusy(true);
    setError(null);

    try {
      const csv = await downloadV1ReportCsv();
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "smeta-market-v1-summary.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "CSV yuklanmadi");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(item: V1ReportSummaryResponse["disputeQueue"][number], outcome: "cancel" | "complete" | "reopen") {
    setBusy(true);
    setError(null);

    try {
      if (item.entity === "order") {
        await resolveOrderDispute(item.id, {
          outcome: outcome === "cancel" ? "cancel" : outcome === "complete" ? "complete" : "reopen",
          reason: resolveReason
        });
      } else {
        await resolveMaterialRequestDispute(item.id, {
          outcome: outcome === "cancel" ? "cancel" : "reopen",
          reason: resolveReason
        });
      }

      await loadReport();
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "Nizo yopilmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-smeta-mauve">V1 hisobot</p>
            <h3 className="mt-1 text-xl font-semibold">Admin monitoring va export</h3>
            <p className="mt-2 text-sm leading-6 text-smeta-mauve">
              Request, order, offer, moliya va nizo holatlari bitta V1 summaryda jamlanadi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="smeta-secondary-button" disabled={busy} onClick={() => void loadReport()}>
              <RefreshCw className="h-4 w-4" />
              Yangilash
            </button>
            <button className="smeta-primary-button" disabled={busy || !report} onClick={() => void handleDownloadCsv()}>
              <Download className="h-4 w-4" />
              CSV
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        {report ? <p className="mt-4 text-xs font-semibold text-smeta-mauve">Generated: {new Date(report.generatedAt).toLocaleString("uz-UZ")}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Requestlar" value={String(report?.counts.requests ?? 0)} note="Jami" />
        <MetricCard label="Orderlar" value={String(report?.counts.orders ?? 0)} note="Jami" />
        <MetricCard label="Nizolar" value={String(report?.counts.disputes ?? 0)} note="Dispute queue" />
        <MetricCard label="Qoldiq qarz" value={formatCompact(report?.financeTotals.remainingDebtUzs ?? 0)} note="UZS" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <StatusBreakdown title="Request statuslari" rows={requestStatusRows} />
        <StatusBreakdown title="Order statuslari" rows={orderStatusRows} />
      </div>

      <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-smeta-clay" />
          <h3 className="text-lg font-semibold">Dispute queue</h3>
        </div>
        <div className="mt-4 overflow-x-auto">
          <label className="mb-3 block max-w-md">
            <span className="text-xs font-semibold text-smeta-mauve">Resolve sababi</span>
            <input
              className="mt-1 w-full rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold"
              value={resolveReason}
              onChange={(event) => setResolveReason(event.target.value)}
            />
          </label>
          <table className="smeta-table min-w-[720px] text-sm">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Kod</th>
                <th>Status</th>
                <th>Izoh</th>
                <th>Vaqt</th>
                <th>Resolve</th>
              </tr>
            </thead>
            <tbody>
              {(report?.disputeQueue ?? []).length === 0 ? (
                <tr>
                  <td className="py-6 text-smeta-mauve" colSpan={6}>
                    Ochiq nizo yo'q.
                  </td>
                </tr>
              ) : (
                report?.disputeQueue.map((item) => (
                  <tr key={`${item.entity}-${item.id}`}>
                    <td>{item.entity}</td>
                    <td className="font-bold">{item.publicCode}</td>
                    <td>
                      <StatusPill label={item.status} />
                    </td>
                    <td>{item.adminNote || "Izoh yo'q"}</td>
                    <td>{new Date(item.createdAt).toLocaleString("uz-UZ")}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {item.entity === "order" ? (
                          <button className="rounded-md border border-smeta-line px-2 py-1 text-xs font-bold" disabled={busy || !resolveReason.trim()} onClick={() => void handleResolve(item, "complete")}>
                            Complete
                          </button>
                        ) : null}
                        <button className="rounded-md border border-smeta-line px-2 py-1 text-xs font-bold" disabled={busy || !resolveReason.trim()} onClick={() => void handleResolve(item, "reopen")}>
                          Reopen
                        </button>
                        <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-bold text-red-700" disabled={busy || !resolveReason.trim()} onClick={() => void handleResolve(item, "cancel")}>
                          Cancel
                        </button>
                      </div>
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

function StatusBreakdown({ rows, title }: { rows: Array<[string, number]>; title: string }) {
  return (
    <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 space-y-2">
        {rows.length === 0 ? <p className="text-sm text-smeta-mauve">Hali data yo'q.</p> : null}
        {rows.map(([status, count]) => (
          <div key={status} className="flex items-center justify-between rounded-xl border border-smeta-line bg-smeta-soft px-3 py-3">
            <StatusPill label={status} />
            <span className="text-sm font-black">{count}</span>
          </div>
        ))}
      </div>
    </section>
  );
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
