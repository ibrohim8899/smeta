import { useEffect, useState } from "react";
import { CheckCircle2, PackageCheck, RefreshCw, ShieldAlert, Truck } from "lucide-react";
import { StatusPill } from "../../components/ui/StatusPill";
import { fetchOrders, updateOrderStatus, type OrderResponse } from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";

type OrderFulfillmentViewProps = {
  onOrdersChanged: () => Promise<void>;
};

const orderActions = [
  {
    icon: CheckCircle2,
    label: "Do'kon qabul qildi",
    note: "Do'kon buyurtmani qabul qildi",
    status: "accepted"
  },
  {
    icon: PackageCheck,
    label: "Tayyorlanmoqda",
    note: "Do'kon materiallarni tayyorlamoqda",
    status: "preparing"
  },
  {
    icon: PackageCheck,
    label: "Tayyor",
    note: "Buyurtma olib ketish yoki yetkazishga tayyor",
    status: "ready"
  },
  {
    icon: Truck,
    label: "Jo'natildi",
    note: "Buyurtma mijoz tomonga jo'natildi",
    status: "dispatched"
  },
  {
    icon: RefreshCw,
    label: "Mijoz tasdiqlaydi",
    note: "Buyurtma yetkazildi, mijoz tasdiqlashi kutilmoqda",
    status: "delivered_pending_confirmation"
  },
  {
    icon: CheckCircle2,
    label: "Yakunlash",
    note: "Mijoz buyurtmani tasdiqladi",
    status: "completed"
  },
  {
    icon: ShieldAlert,
    label: "Nizo ochish",
    note: "Buyurtma bo'yicha nizo ochildi",
    status: "disputed"
  }
] as const;

export function OrderFulfillmentView({ onOrdersChanged }: OrderFulfillmentViewProps) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busyStatus, setBusyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;

  async function loadOrders() {
    try {
      const result = await fetchOrders();
      setOrders(result);
      setSelectedOrderId((currentId) => {
        if (currentId && result.some((order) => order.id === currentId)) {
          return currentId;
        }

        return result[0]?.id ?? null;
      });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Buyurtmalar yuklanmadi");
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function handleStatus(status: string, note: string) {
    if (!selectedOrder) {
      return;
    }

    setBusyStatus(status);
    setError(null);

    try {
      await updateOrderStatus(selectedOrder.id, status, note);
      await loadOrders();
      await onOrdersChanged();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Buyurtma statusi o'zgarmadi");
    } finally {
      setBusyStatus(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-smeta-line bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Buyurtmalar</h3>
            <p className="mt-1 text-sm text-smeta-mauve">Tanlangan takliflardan yaratilgan real buyurtmalar.</p>
          </div>
          <button
            className="rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold disabled:opacity-60"
            disabled={Boolean(busyStatus)}
            onClick={() => void loadOrders()}
          >
            Yangilash
          </button>
        </div>

        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {orders.length === 0 ? (
            <p className="rounded-md bg-smeta-soft px-3 py-4 text-sm text-smeta-mauve">
              Hali buyurtma yo'q. Avval mijoz takliflardan birini tanlashi kerak.
            </p>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                className={`w-full rounded-md border px-3 py-3 text-left transition ${
                  selectedOrder?.id === order.id ? "border-smeta-clay bg-smeta-soft" : "border-smeta-line bg-white hover:bg-smeta-soft"
                }`}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{order.publicCode}</p>
                  <StatusPill label={order.status} />
                </div>
                <p className="mt-2 text-sm text-smeta-mauve">
                  {order.request.publicCode} · {order.store.name}
                </p>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        {selectedOrder ? (
          <>
            <div className="flex flex-col gap-3 border-b border-smeta-line pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-smeta-mauve">Buyurtma bajarilishi</p>
                <h3 className="mt-1 text-xl font-semibold">{selectedOrder.publicCode}</h3>
              </div>
              <StatusPill label={selectedOrder.status} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Info label="So'rov" value={selectedOrder.request.publicCode} />
              <Info label="Do'kon" value={selectedOrder.store.name} />
              <Info label="Summa" value={`${selectedOrder.acceptedAmountUzs.toLocaleString("uz-UZ")} UZS`} />
              <Info label="Hozirgi holat" value={formatStatusLabel(selectedOrder.status)} />
            </div>

            <div className="mt-5 rounded-md bg-smeta-soft px-3 py-3">
              <p className="text-xs font-semibold text-smeta-mauve">Izoh</p>
              <p className="mt-1 text-sm font-semibold">{selectedOrder.statusNote || "Izoh yo'q"}</p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {orderActions.map(({ icon: Icon, label, note, status }) => (
                <button
                  key={status}
                  className="flex items-center justify-center gap-2 rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 hover:bg-smeta-soft"
                  disabled={Boolean(busyStatus) || selectedOrder.status === status}
                  onClick={() => void handleStatus(status, note)}
                >
                  <Icon className="h-4 w-4 text-smeta-clay" />
                  {busyStatus === status ? "Saqlanmoqda..." : label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-md bg-smeta-soft px-3 py-4 text-sm text-smeta-mauve">
            Buyurtma tanlanganda uning bajarilish bosqichlari shu yerda ko'rinadi.
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
