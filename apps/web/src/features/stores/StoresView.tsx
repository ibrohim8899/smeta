import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Store, XCircle } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusPill } from "../../components/ui/StatusPill";
import { fetchStores, updateStoreStatus, type StoreResponse } from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import { matchesSearch } from "../../lib/search";

const statusOrder: Record<string, number> = {
  pending: 0,
  approved: 1,
  suspended: 2,
  rejected: 3,
  archived: 4
};

type StoresViewProps = {
  searchQuery?: string;
};

export function StoresView({ searchQuery = "" }: StoresViewProps) {
  const [stores, setStores] = useState<StoreResponse[]>([]);
  const [busyStoreId, setBusyStoreId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sortedStores = useMemo(
    () =>
      stores.filter((store) =>
        matchesSearch(searchQuery, [store.name, store.ownerName, store.address, store.phone, store.serviceRegions, store.categories, store.status, store.adminNote])
      ).sort((first, second) => {
        const statusDiff = (statusOrder[first.status] ?? 99) - (statusOrder[second.status] ?? 99);
        return statusDiff || first.name.localeCompare(second.name);
      }),
    [searchQuery, stores]
  );
  const counts = useMemo(
    () => ({
      active: stores.filter((store) => store.active && store.status === "approved").length,
      pending: stores.filter((store) => store.status === "pending").length,
      rejected: stores.filter((store) => store.status === "rejected").length,
      total: stores.length
    }),
    [stores]
  );

  async function loadStores() {
    try {
      setLoading(true);
      setStores(await fetchStores());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Do'konlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStores();
  }, []);

  async function handleStatus(store: StoreResponse, status: "approved" | "rejected" | "suspended") {
    setBusyStoreId(store.id);
    setError(null);

    try {
      await updateStoreStatus(store.id, {
        active: status === "approved",
        adminNote:
          status === "approved"
            ? "Admin do'kon arizasini tasdiqladi"
            : status === "suspended"
              ? "Admin do'konni vaqtincha to'xtatdi"
              : "Admin do'kon arizasini rad etdi",
        status
      });
      await loadStores();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Do'kon statusi o'zgarmadi");
    } finally {
      setBusyStoreId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Jami do'kon" value={String(counts.total)} note="Barcha ariza va profillar" />
        <MetricCard label="Kutilayotgan ariza" value={String(counts.pending)} note="Admin tekshiradi" />
        <MetricCard label="Aktiv do'kon" value={String(counts.active)} note="Taklif bera oladi" />
        <MetricCard label="Rad etilgan" value={String(counts.rejected)} note="Qayta ko'rib chiqilishi mumkin" />
      </section>

      <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-smeta-soft p-2 text-smeta-clay">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">Store applications</p>
              <h3 className="text-xl font-black">Do'kon arizalari va profillari</h3>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-smeta-line px-3 py-2 text-sm font-semibold" onClick={() => void loadStores()}>
            <RefreshCw className="h-4 w-4 text-smeta-clay" />
            Yangilash
          </button>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-4 text-sm text-smeta-mauve">Yuklanmoqda...</p> : null}

        <div className="mt-5 overflow-x-auto">
          <table className="smeta-table min-w-[980px] text-sm">
            <thead>
              <tr>
                <th>Do'kon</th>
                <th>Hududlar</th>
                <th>Kategoriyalar</th>
                <th>Aloqa</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {!loading && sortedStores.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-smeta-mauve" colSpan={6}>
                    {searchQuery.trim() ? "Qidiruv bo'yicha do'kon topilmadi." : "Hali do'kon arizasi yo'q."}
                  </td>
                </tr>
              ) : null}
              {sortedStores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <p className="font-extrabold">{store.name}</p>
                    <p className="mt-1 text-xs font-medium text-smeta-mauve">{store.ownerName || store.address || "Qo'shimcha ma'lumot yo'q"}</p>
                    {store.adminNote ? <p className="mt-1 text-xs text-smeta-mauve">{store.adminNote}</p> : null}
                  </td>
                  <td>{store.serviceRegions.length ? store.serviceRegions.join(", ") : "-"}</td>
                  <td>{store.categories.length ? store.categories.join(", ") : "-"}</td>
                  <td>{store.phone || "-"}</td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <StatusPill label={store.status} />
                      <span className="text-xs font-semibold text-smeta-mauve">{store.active ? "Aktiv" : "Aktiv emas"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-smeta-line px-2 py-1 text-xs font-semibold disabled:opacity-60"
                        disabled={Boolean(busyStoreId) || (store.status === "approved" && store.active)}
                        onClick={() => void handleStatus(store, "approved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-smeta-clay" />
                        Tasdiqlash
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-smeta-line px-2 py-1 text-xs font-semibold disabled:opacity-60"
                        disabled={Boolean(busyStoreId) || store.status === "rejected"}
                        onClick={() => void handleStatus(store, "rejected")}
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                        Rad etish
                      </button>
                      <button
                        className="rounded-md border border-smeta-line px-2 py-1 text-xs font-semibold disabled:opacity-60"
                        disabled={Boolean(busyStoreId) || store.status === "suspended"}
                        onClick={() => void handleStatus(store, "suspended")}
                      >
                        To'xtatish
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-smeta-mauve">
                      {store.verifiedAt ? `Tasdiqlangan: ${new Date(store.verifiedAt).toLocaleString("uz-UZ")}` : formatStatusLabel(store.status)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
