import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { CustomerRequestView } from "../customer-request/CustomerRequestView";
import { fetchDealerByReferral, type DealerPublicReferralResponse } from "../../lib/api";

type ReferralLandingViewProps = {
  referralCode: string;
  onRequestCreated: () => Promise<void>;
};

export function ReferralLandingView({ onRequestCreated, referralCode }: ReferralLandingViewProps) {
  const [dealer, setDealer] = useState<DealerPublicReferralResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDealer() {
      try {
        const result = await fetchDealerByReferral(referralCode);
        setDealer(result);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Referral link topilmadi");
      }
    }

    void loadDealer();
  }, [referralCode]);

  if (showForm && dealer) {
    return (
      <main className="min-h-screen bg-smeta-paper px-4 py-6 text-smeta-ink sm:px-6">
        <div className="mx-auto max-w-6xl">
          <CustomerRequestView
            initialDealerReferral={dealer.displayName}
            initialDealerReferralCode={dealer.referralCode}
            onRequestCreated={onRequestCreated}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center bg-smeta-paper px-4 py-6 text-smeta-ink sm:px-6">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-smeta-line bg-smeta-surface p-6 shadow-smeta">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-smeta-soft text-smeta-clay">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black">SMETA MARKET</h1>
            <p className="mt-2 text-sm leading-6 text-smeta-mauve">
              Bitta material ro'yxatini yuboring. Tasdiqlangan do'konlardan maxfiy va solishtiriladigan takliflar olinadi.
            </p>
          </div>
        </div>

        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        {dealer ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-smeta-line bg-smeta-soft px-4 py-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-smeta-mauve">Tavsiya qilgan usta</p>
              <p className="mt-1 text-xl font-black">{dealer.displayName}</p>
              <p className="mt-1 text-sm font-semibold text-smeta-mauve">
                {dealer.companyName || dealer.region} - {dealer.referralCode}
              </p>
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-smeta-clay px-5 py-4 text-sm font-bold text-white shadow-smeta-soft"
              onClick={() => setShowForm(true)}
            >
              Material ro'yxatini yuborish
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-xs leading-5 text-smeta-mauve">
              Ro'yxat faqat mos tasdiqlangan do'konlarga yuboriladi. Kontakt ma'lumotlari g'olib do'kon qabul qilmaguncha yashiriladi.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
