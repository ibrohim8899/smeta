import { useEffect, useMemo, useState } from "react";
import { APP_CURRENCY } from "@smeta/shared";
import { Link2, ShieldCheck, UserRoundPlus } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { StatusPill } from "../../components/ui/StatusPill";
import { createDealer, fetchDealers, updateDealerStatus, type DealerResponse } from "../../lib/api";

export function DealerView() {
  const [dealers, setDealers] = useState<DealerResponse[]>([]);
  const [displayName, setDisplayName] = useState("Usta Sardor");
  const [phone, setPhone] = useState("+998 93 222 33 44");
  const [region, setRegion] = useState("Namangan sh.");
  const [companyName, setCompanyName] = useState("Sardor qurilish guruhi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyDealerId, setBusyDealerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approvedCount = useMemo(() => dealers.filter((dealer) => dealer.status === "approved").length, [dealers]);
  const pendingCount = useMemo(() => dealers.filter((dealer) => dealer.status === "pending").length, [dealers]);
  const activeReferralCount = useMemo(() => dealers.filter((dealer) => dealer.referralActive).length, [dealers]);

  async function loadDealers() {
    try {
      const result = await fetchDealers();
      setDealers(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ustalar yuklanmadi");
    }
  }

  useEffect(() => {
    void loadDealers();
  }, []);

  async function handleCreateDealer() {
    setIsSubmitting(true);
    setError(null);

    try {
      await createDealer({
        companyName,
        displayName,
        phone,
        region
      });
      await loadDealers();
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

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Tasdiqlangan ustalar" value={String(approvedCount)} note="Referral ishlaydi" />
          <MetricCard label="Kutilayotgan ariza" value={String(pendingCount)} note="Admin tekshiradi" />
          <MetricCard label="Aktiv referral" value={String(activeReferralCount)} note={APP_CURRENCY} />
        </div>

        <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ustalar va referral kodlar</h3>
              <p className="mt-1 text-sm text-smeta-mauve">
                Tasdiqlangan usta referral link orqali mijoz olib keladi; request yaratilganda attribution snapshot qilinadi.
              </p>
            </div>
            <button className="rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold" onClick={() => void loadDealers()}>
              Yangilash
            </button>
          </div>

          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[940px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.12em] text-smeta-mauve">
                  <th className="border-b border-smeta-line px-3 py-3">Usta</th>
                  <th className="border-b border-smeta-line px-3 py-3">Hudud</th>
                  <th className="border-b border-smeta-line px-3 py-3">Referral kodi</th>
                  <th className="border-b border-smeta-line px-3 py-3">Link</th>
                  <th className="border-b border-smeta-line px-3 py-3">Holat</th>
                  <th className="border-b border-smeta-line px-3 py-3">Amal</th>
                </tr>
              </thead>
              <tbody>
                {dealers.length === 0 ? (
                  <tr>
                    <td className="border-b border-smeta-line px-3 py-6 text-smeta-mauve" colSpan={6}>
                      Hali usta yo'q.
                    </td>
                  </tr>
                ) : (
                  dealers.map((dealer) => (
                    <tr key={dealer.id}>
                      <td className="border-b border-smeta-line px-3 py-4">
                        <p className="font-semibold">{dealer.displayName}</p>
                        <p className="text-xs text-smeta-mauve">{dealer.companyName || dealer.phone || "Qo'shimcha ma'lumot yo'q"}</p>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">{dealer.region}</td>
                      <td className="border-b border-smeta-line px-3 py-4 font-semibold">{dealer.referralCode}</td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        <span className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-md bg-smeta-soft px-2 py-1 text-xs text-smeta-mauve">
                          <Link2 className="h-3 w-3 shrink-0" />
                          {dealer.referralLink}
                        </span>
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">
                        <StatusPill label={dealer.status} />
                      </td>
                      <td className="border-b border-smeta-line px-3 py-4">
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
                        </div>
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
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-smeta-clay px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !displayName || !region}
          onClick={handleCreateDealer}
        >
          <ShieldCheck className="h-4 w-4" />
          {isSubmitting ? "Saqlanmoqda..." : "Ariza yaratish"}
        </button>

        <p className="mt-4 rounded-md bg-smeta-soft px-3 py-3 text-sm leading-6 text-smeta-mauve">
          TZ bo'yicha productionda bu ariza Telegram bot orqali boshlanadi. Hozir business flow ishlashi uchun real backend ariza va admin tasdiqlash qo'shildi.
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
        className="mt-1 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-medium outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
