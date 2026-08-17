import { useEffect, useMemo, useState } from "react";
import { BellRing, Send } from "lucide-react";
import { StatusPill } from "../../components/ui/StatusPill";
import { createNotification, fetchNotifications, retryNotification, updateNotificationStatus, type NotificationResponse } from "../../lib/api";

const statusOptions = [
  { label: "Hammasi", value: "" },
  { label: "Kutilmoqda", value: "pending" },
  { label: "Yuborildi", value: "sent" },
  { label: "Processing", value: "processing" },
  { label: "Xato", value: "failed" },
  { label: "Dead letter", value: "dead_letter" },
  { label: "O'tkazildi", value: "skipped" }
];

const roleLabels: Record<string, string> = {
  admin: "Admin",
  customer: "Mijoz",
  dealer: "Usta",
  finance: "Moliya",
  store: "Do'kon",
  superadmin: "Superadmin"
};

const channelLabels: Record<string, string> = {
  telegram: "Telegram",
  web: "Web"
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadNotifications(status = statusFilter) {
    try {
      setLoading(true);
      const data = await fetchNotifications(100, status || undefined);
      setNotifications(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Bildirishnomalarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTestNotification() {
    await createNotification({
      bodyUz: "Bu test bildirishnoma. Telegram token ulanganda shu outboxdan real xabar yuboriladi.",
      channel: "web",
      eventType: "notification.test",
      metadata: {
        source: "web_preview"
      },
      recipientRole: "admin",
      titleUz: "Test bildirishnoma"
    });
    await loadNotifications();
  }

  async function handleStatusChange(id: string, status: string) {
    await updateNotificationStatus(id, status, status === "failed" ? "Manual test xatosi" : undefined);
    await loadNotifications();
  }

  async function handleRetry(id: string) {
    await retryNotification(id);
    await loadNotifications();
  }

  useEffect(() => {
    void loadNotifications(statusFilter);
  }, [statusFilter]);

  const counts = useMemo(
    () => ({
      failed: notifications.filter((notification) => notification.status === "failed").length,
      pending: notifications.filter((notification) => notification.status === "pending").length,
      processing: notifications.filter((notification) => notification.status === "processing").length,
      sent: notifications.filter((notification) => notification.status === "sent").length,
      total: notifications.length
    }),
    [notifications]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-smeta-soft p-2 text-smeta-clay">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-smeta-mauve">Notification outbox</p>
              <h3 className="mt-1 text-xl font-semibold">Bildirishnomalar navbati</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-smeta-mauve">
                Hozir bildirishnomalar tizim ichida navbatga yoziladi. Telegram bot token ulanganda pending yozuvlar shu yerdan real
                yuboriladi va statusi avtomatik yangilanadi.
              </p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-smeta-deep px-4 py-2 text-sm font-semibold text-white" onClick={handleCreateTestNotification}>
            <Send className="h-4 w-4" />
            Test yaratish
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Jami" value={counts.total} />
          <Metric label="Kutilmoqda" value={counts.pending} />
          <Metric label="Processing" value={counts.processing} />
          <Metric label="Yuborildi" value={counts.sent} />
          <Metric label="Xato" value={counts.failed} />
        </div>
      </section>

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Oxirgi bildirishnomalar</h3>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-md border border-smeta-line bg-white px-3 py-2 text-sm outline-none focus:border-smeta-clay"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-smeta-line px-3 py-2 text-sm font-semibold text-smeta-ink" onClick={() => void loadNotifications()}>
              Yangilash
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-4 text-sm text-smeta-mauve">Yuklanmoqda...</p> : null}

        <div className="mt-5 space-y-3">
          {!loading && notifications.length === 0 ? <p className="text-sm text-smeta-mauve">Hali bildirishnoma yo'q.</p> : null}
          {notifications.map((notification) => (
            <article key={notification.id} className="rounded-md border border-smeta-line bg-smeta-paper p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={notification.status} />
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-smeta-mauve">
                      {channelLabels[notification.channel] ?? notification.channel}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-smeta-mauve">
                      {roleLabels[notification.recipientRole] ?? notification.recipientRole}
                    </span>
                  </div>
                  <h4 className="mt-3 font-semibold">{notification.titleUz}</h4>
                  <p className="mt-1 text-sm leading-6 text-smeta-mauve">{notification.bodyUz}</p>
                  <p className="mt-2 text-xs text-smeta-mauve">
                    {new Date(notification.createdAt).toLocaleString("uz-UZ")} · {notification.eventType}
                    {notification.attempts > 0 ? ` · urinish: ${notification.attempts}` : ""}
                  </p>
                  {notification.lastError ? <p className="mt-2 text-sm text-red-700">Xato: {notification.lastError}</p> : null}
                  {notification.scheduledAt ? <p className="mt-2 text-xs text-smeta-mauve">Keyingi urinish: {new Date(notification.scheduledAt).toLocaleString("uz-UZ")}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button className="rounded-md bg-smeta-deep px-3 py-2 text-xs font-semibold text-white" onClick={() => void handleStatusChange(notification.id, "sent")}>
                    Yuborildi
                  </button>
                  <button
                    className="rounded-md border border-smeta-line px-3 py-2 text-xs font-semibold text-smeta-ink"
                    onClick={() => void handleStatusChange(notification.id, "failed")}
                  >
                    Xato
                  </button>
                  <button
                    className="rounded-md border border-smeta-line px-3 py-2 text-xs font-semibold text-smeta-ink"
                    onClick={() => void handleStatusChange(notification.id, "skipped")}
                  >
                    O'tkazish
                  </button>
                  <button
                    className="rounded-md border border-smeta-line px-3 py-2 text-xs font-semibold text-smeta-ink disabled:opacity-50"
                    disabled={notification.status === "sent"}
                    onClick={() => void handleRetry(notification.id)}
                  >
                    Retry
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-smeta-soft p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-smeta-mauve">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
