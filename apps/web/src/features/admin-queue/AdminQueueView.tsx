import { Clock3, MoreVertical, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { IconButton } from "../../components/ui/IconButton";
import { RequestDetails } from "../../components/ui/RequestDetails";
import { StatusPill } from "../../components/ui/StatusPill";
import type { RequestSummary } from "../../types/domain";

type AdminQueueViewProps = {
  onAssignStores: (apiId: string) => Promise<void>;
  onCancel: (apiId: string) => Promise<void>;
  onSelectRequest: (id: string) => void;
  onStatusUpdate: (apiId: string, status: string, note?: string) => Promise<void>;
  requests: RequestSummary[];
  requestsError: string | null;
  selectedRequest: RequestSummary;
  selectedRequestId: string;
};

export function AdminQueueView({
  onCancel,
  onAssignStores,
  onSelectRequest,
  onStatusUpdate,
  requests,
  requestsError,
  selectedRequest,
  selectedRequestId
}: AdminQueueViewProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function runAction(actionName: string, action: () => Promise<void>) {
    setActionError(null);
    setBusyAction(actionName);

    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Amal bajarilmadi");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-smeta-line bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">So'rovlar navbati</h3>
          <IconButton label="Yana">
            <MoreVertical className="h-4 w-4" />
          </IconButton>
        </div>
        {requestsError ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{requestsError}</p> : null}
        <div className="mt-4 space-y-3">
          {requests.map((request) => (
            <button
              key={request.id}
              className={`w-full rounded-md border px-3 py-3 text-left transition ${
                selectedRequestId === request.id ? "border-smeta-clay bg-smeta-soft" : "border-smeta-line bg-white hover:bg-smeta-soft"
              }`}
              onClick={() => onSelectRequest(request.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{request.id}</p>
                <StatusPill label={request.statusLabel} />
              </div>
              <p className="mt-2 text-sm text-smeta-mauve">
                {request.customer} · {request.region}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-smeta-line pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-smeta-mauve">Tekshiruv</p>
            <h3 className="mt-1 text-xl font-semibold">{selectedRequest.id}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold disabled:opacity-60"
              disabled={Boolean(busyAction)}
              onClick={() => runAction("under_review", () => onStatusUpdate(selectedRequest.apiId, "under_review", "Admin tekshiruvni boshladi"))}
            >
              Tekshiruvga olish
            </button>
            <button
              className="rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold disabled:opacity-60"
              disabled={Boolean(busyAction)}
              onClick={() => runAction("correction_required", () => onStatusUpdate(selectedRequest.apiId, "correction_required", "Mijozdan tuzatish so'raldi"))}
            >
              Tuzatish so'rash
            </button>
            <button
              className="rounded-md bg-smeta-clay px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={Boolean(busyAction)}
              onClick={() => runAction("assign", () => onAssignStores(selectedRequest.apiId))}
            >
              Do'konlarga yuborish
            </button>
            <button
              className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
              disabled={Boolean(busyAction)}
              onClick={() => runAction("cancel", () => onCancel(selectedRequest.apiId))}
            >
              <Trash2 className="h-4 w-4" />
              Bekor qilish
            </button>
          </div>
        </div>
        {actionError ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p> : null}
        {busyAction ? <p className="mt-3 rounded-md bg-smeta-soft px-3 py-2 text-sm text-smeta-mauve">Amal bajarilmoqda...</p> : null}
        <RequestDetails request={selectedRequest} />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Control label="Kontakt maskalangan" value="Faqat tanlangan do'kon ko'radi" icon={ShieldCheck} />
          <Control label="Biriktirish" value="5-15 do'kon" icon={UsersRound} />
          <Control label="Muddat" value={selectedRequest.deadline} icon={Clock3} />
        </div>
      </section>
    </div>
  );
}

function Control({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) {
  return (
    <div className="rounded-md border border-smeta-line bg-smeta-soft p-4">
      <Icon className="h-5 w-5 text-smeta-clay" />
      <p className="mt-3 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs leading-5 text-smeta-mauve">{value}</p>
    </div>
  );
}
