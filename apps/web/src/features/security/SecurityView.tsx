import { useEffect, useMemo, useState } from "react";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@smeta/shared";
import { ShieldCheck, UsersRound } from "lucide-react";
import { StatusPill } from "../../components/ui/StatusPill";
import {
  cancelBrowserLogin,
  clearSessionToken,
  createBrowserLogin,
  fetchAuditLogs,
  fetchAuthSession,
  fetchPermissionMatrix,
  fetchUsers,
  pollBrowserLogin,
  storeSessionToken,
  updateUserAccess,
  type AuditLogResponse,
  type BrowserLoginResponse,
  type PermissionMatrixResponse,
  type UserResponse
} from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import { matchesSearch } from "../../lib/search";

const permissionLabels: Record<string, string> = {
  "audit.read": "Audit tarixini ko'rish",
  "dealers.apply": "Usta arizasi berish",
  "dealers.moderate": "Ustani tasdiqlash yoki bloklash",
  "dealers.read": "Ustalarni ko'rish",
  "finance.read": "Moliya jurnalini ko'rish",
  "finance.record_payment": "Do'kon to'lovini yozish",
  "offers.create": "Do'kon taklifi yaratish",
  "offers.read": "Takliflarni ko'rish",
  "offers.select": "Taklif tanlash",
  "orders.fulfill": "Buyurtmani bajarish",
  "orders.confirm": "Buyurtmani mijoz tasdiqlashi",
  "orders.read": "Buyurtmalarni ko'rish",
  "reports.read": "V1 hisobotlarni ko'rish",
  "requests.assign_stores": "So'rovni do'konlarga yuborish",
  "requests.create": "Material so'rovi yaratish",
  "requests.moderate": "So'rovni moderatsiya qilish",
  "requests.read": "So'rovlarni ko'rish",
  "stores.manage": "Do'konlarni boshqarish",
  "stores.read": "Do'konlarni ko'rish",
  "notifications.manage": "Bildirishnomalarni boshqarish",
  "notifications.read": "Bildirishnomalarni ko'rish",
  "settings.manage": "Tizim sozlamalarini boshqarish"
};

const actionLabels: Record<string, string> = {
  "dealer.application_created": "Usta arizasi yaratildi",
  "dealer.status_updated": "Usta statusi o'zgardi",
  "finance.snapshot_created": "Moliya snapshot yaratildi",
  "finance.payment_recorded": "Moliya to'lovi yozildi",
  "material_request.assigned_to_stores": "So'rov do'konlarga yuborildi",
  "material_request.created": "Material so'rovi yaratildi",
  "material_request.status_updated": "So'rov statusi o'zgardi",
  "order.created_from_offer": "Taklifdan buyurtma yaratildi",
  "order.status_updated": "Buyurtma statusi o'zgardi",
  "order.delivery_confirmed": "Yetkazish mijoz tomonidan tasdiqlandi",
  "store_offer.created": "Do'kon taklifi yaratildi",
  "store.application_created": "Do'kon arizasi yaratildi",
  "store.created": "Do'kon yaratildi",
  "store.profile_updated": "Do'kon profili yangilandi",
  "store.status_updated": "Do'kon statusi o'zgardi",
  "store_offer.updated": "Do'kon taklifi yangilandi"
};

const browserLoginStatusLabels: Record<string, string> = {
  authenticated: "Tasdiqlandi",
  canceled: "Bekor qilingan",
  consumed: "Ishlatilgan",
  expired: "Muddati tugagan",
  not_started: "Boshlanmagan",
  pending: "Telegram tasdig'i kutilmoqda"
};

const privilegedRoles: UserRole[] = ["admin", "finance", "superadmin"];

type SecurityViewProps = {
  searchQuery?: string;
};

export function SecurityView({ searchQuery = "" }: SecurityViewProps) {
  const [activeRole, setActiveRole] = useState<UserRole>("superadmin");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<PermissionMatrixResponse>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [browserLogin, setBrowserLogin] = useState<BrowserLoginResponse | null>(null);
  const [browserLoginStatus, setBrowserLoginStatus] = useState<string>("not_started");
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSecurityData(role = activeRole) {
    try {
      setLoading(true);
      const [session, permissionMatrix, logs, userList] = await Promise.all([fetchAuthSession(role), fetchPermissionMatrix(), fetchAuditLogs(), fetchUsers()]);
      setPermissions(session.permissions);
      setMatrix(permissionMatrix);
      setAuditLogs(logs);
      setUsers(userList);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Xavfsizlik ma'lumotlarini yuklab bo'lmadi";
      setError(message === "Sessiya topilmadi" ? "Sessiya topilmadi. Qayta Telegram orqali kiring yoki sessiyani tozalang." : message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSecurityData(activeRole);
  }, [activeRole]);

  const rolePermissionCount = useMemo(
    () => matrix.find((item) => item.role === activeRole)?.permissions.length ?? permissions.length,
    [activeRole, matrix, permissions.length]
  );
  const filteredAuditLogs = useMemo(
    () =>
      auditLogs.filter((log) =>
        matchesSearch(searchQuery, [actionLabels[log.action], log.action, log.actorRole, log.entityType, log.entityId, log.reason, log.metadata])
      ),
    [auditLogs, searchQuery]
  );
  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        matchesSearch(searchQuery, [
          user.displayName,
          user.email,
          user.telegramUsername,
          user.telegramUserId,
          user.roles,
          user.roles.map((role) => ROLE_LABELS[role as UserRole] ?? role),
          user.status,
          formatStatusLabel(user.status),
          user.active ? "aktiv" : "aktiv emas"
        ])
      ),
    [searchQuery, users]
  );

  async function startBrowserLogin() {
    try {
      const login = await createBrowserLogin(activeRole);
      setBrowserLogin(login);
      setBrowserLoginStatus(login.status);
      setError(null);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Telegram login yaratilmadi");
    }
  }

  async function pollLogin() {
    if (!browserLogin) {
      return;
    }

    try {
      const result = await pollBrowserLogin(browserLogin.nonce);
      setBrowserLoginStatus(result.status);

      if (result.status === "authenticated") {
        storeSessionToken(result.accessToken);
        await loadSecurityData(activeRole);
      }
    } catch (pollError) {
      setError(pollError instanceof Error ? pollError.message : "Telegram login holati olinmadi");
    }
  }

  async function cancelLogin() {
    if (!browserLogin) {
      return;
    }

    await cancelBrowserLogin(browserLogin.nonce);
    setBrowserLoginStatus("canceled");
  }

  async function logoutLocalSession() {
    clearSessionToken();
    setBrowserLogin(null);
    setBrowserLoginStatus("not_started");
    await loadSecurityData(activeRole);
  }

  async function togglePrivilegedRole(user: UserResponse, role: UserRole) {
    const nextRoles = user.roles.includes(role) ? user.roles.filter((item) => item !== role) : [...user.roles, role];
    const uniqueRoles = Array.from(new Set(nextRoles.length ? nextRoles : ["customer"]));

    setBusyUserId(user.id);
    setError(null);

    try {
      await updateUserAccess(user.id, {
        active: user.active,
        roles: uniqueRoles,
        status: user.active ? "active" : user.status
      });
      await loadSecurityData(activeRole);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Rol yangilanmadi");
    } finally {
      setBusyUserId(null);
    }
  }

  async function toggleUserActive(user: UserResponse) {
    const nextActive = !user.active;

    setBusyUserId(user.id);
    setError(null);

    try {
      await updateUserAccess(user.id, {
        active: nextActive,
        roles: user.roles,
        status: nextActive ? "active" : "suspended"
      });
      await loadSecurityData(activeRole);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Foydalanuvchi holati yangilanmadi");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-smeta-soft p-2 text-smeta-clay">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-smeta-mauve">Auth va rollar</p>
            <h3 className="mt-1 text-xl font-semibold">Rol ruxsatlari skeletoni</h3>
            <p className="mt-2 text-sm leading-6 text-smeta-mauve">
              Kirish Telegram orqali tasdiqlanadi. Do'kon va usta rollari ariza tasdiqlangandan keyin ochiladi, admin va moliya huquqlarini esa faqat superadmin biriktiradi.
            </p>
          </div>
        </div>

        <label className="mt-5 block text-sm font-semibold" htmlFor="role-select">
          Rolni ko'rish
        </label>
        <select
          className="mt-2 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm outline-none focus:border-smeta-clay"
          id="role-select"
          value={activeRole}
          onChange={(event) => setActiveRole(event.target.value as UserRole)}
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-smeta-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-smeta-mauve">Status</p>
            <p className="mt-2 text-lg font-semibold">Aktiv</p>
          </div>
          <div className="rounded-md bg-smeta-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-smeta-mauve">Ruxsatlar</p>
            <p className="mt-2 text-lg font-semibold">{rolePermissionCount} ta</p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-smeta-line bg-smeta-paper p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-smeta-mauve">Telegram orqali kirish</p>
              <p className="mt-1 text-sm font-semibold">Holat: {browserLoginStatusLabels[browserLoginStatus] ?? browserLoginStatus}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-smeta-ink px-3 py-2 text-sm font-bold text-white" onClick={() => void startBrowserLogin()}>
                Telegram link yaratish
              </button>
              <button className="rounded-md border border-smeta-line px-3 py-2 text-sm font-bold" disabled={!browserLogin} onClick={() => void pollLogin()}>
                Holatni tekshirish
              </button>
              <button className="rounded-md border border-smeta-line px-3 py-2 text-sm font-bold" disabled={!browserLogin} onClick={() => void cancelLogin()}>
                Bekor qilish
              </button>
              <button className="rounded-md border border-smeta-line px-3 py-2 text-sm font-bold" onClick={() => void logoutLocalSession()}>
                Sessiyani tozalash
              </button>
            </div>
          </div>
          {browserLogin ? (
            <a className="mt-3 block break-all rounded-md bg-white px-3 py-2 text-xs font-semibold text-smeta-clay" href={browserLogin.deepLink}>
              {browserLogin.qrPayload}
            </a>
          ) : null}
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-4 text-sm text-smeta-mauve">Yuklanmoqda...</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <span key={permission} className="rounded-full bg-smeta-soft px-3 py-1 text-xs font-semibold text-smeta-ink">
              {permissionLabels[permission] ?? permission}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-smeta-mauve">Audit</p>
            <h3 className="mt-1 text-xl font-semibold">Oxirgi tizim harakatlari</h3>
          </div>
          <button className="rounded-md bg-smeta-deep px-3 py-2 text-sm font-semibold text-white" onClick={() => void loadSecurityData()}>
            Yangilash
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {filteredAuditLogs.length === 0 && !loading ? (
            <p className="text-sm text-smeta-mauve">{searchQuery.trim() ? "Qidiruv bo'yicha audit yozuvi topilmadi." : "Hali audit yozuvi yo'q."}</p>
          ) : null}
          {filteredAuditLogs.map((log) => (
            <article key={log.id} className="rounded-md border border-smeta-line bg-smeta-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{actionLabels[log.action] ?? log.action}</p>
                <StatusPill label={log.actorRole ?? "system"} />
              </div>
              <p className="mt-1 text-xs text-smeta-mauve">
                {new Date(log.createdAt).toLocaleString("uz-UZ")} · {log.entityType}
                {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
              </p>
              {log.reason ? <p className="mt-2 text-sm text-smeta-mauve">Izoh: {log.reason}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm xl:col-span-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-smeta-soft p-2 text-smeta-clay">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-smeta-mauve">User access</p>
              <h3 className="mt-1 text-xl font-semibold">Foydalanuvchilar va rollar</h3>
              <p className="mt-2 text-sm leading-6 text-smeta-mauve">
                Mijoz avtomatik kiradi. Usta va do'kon rollari o'z approval sahifalarida beriladi. Admin, moliya va superadmin rollarini shu
                yerdan faqat superadmin boshqaradi.
              </p>
            </div>
          </div>
          <button className="rounded-md bg-smeta-deep px-3 py-2 text-sm font-semibold text-white" onClick={() => void loadSecurityData()}>
            Yangilash
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="smeta-table min-w-[980px] text-sm">
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>Telegram</th>
                <th>Rollar</th>
                <th>Admin/Moliya huquqi</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && !loading ? (
                <tr>
                  <td className="px-3 py-6 text-smeta-mauve" colSpan={6}>
                    {searchQuery.trim()
                      ? "Qidiruv bo'yicha foydalanuvchi topilmadi."
                      : "Hali foydalanuvchi yo'q. Odam Telegram botda /start bosgandan keyin shu yerda ko'rinadi."}
                  </td>
                </tr>
              ) : null}
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="mt-1 text-xs text-smeta-mauve">{user.email || user.id.slice(0, 8)}</p>
                  </td>
                  <td>
                    <p className="font-semibold">{user.telegramLinked ? "Ulangan" : "Ulanmagan"}</p>
                    <p className="mt-1 text-xs text-smeta-mauve">{user.telegramUsername ? `@${user.telegramUsername}` : user.telegramUserId || "-"}</p>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <StatusPill key={role} label={ROLE_LABELS[role as UserRole] ?? role} />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-smeta-mauve">
                      Oxirgi kirish: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("uz-UZ") : "hali yo'q"}
                    </p>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {privilegedRoles.map((role) => {
                        const selected = user.roles.includes(role);

                        return (
                          <button
                            className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-60 ${
                              selected ? "border-smeta-clay bg-smeta-clay text-white" : "border-smeta-line bg-white text-smeta-ink"
                            }`}
                            disabled={Boolean(busyUserId)}
                            key={role}
                            onClick={() => void togglePrivilegedRole(user, role)}
                          >
                            {ROLE_LABELS[role]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <StatusPill label={user.status} />
                      <span className="text-xs font-semibold text-smeta-mauve">{user.active ? "Aktiv" : "Aktiv emas"}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="rounded-md border border-smeta-line px-2 py-1 text-xs font-semibold disabled:opacity-60"
                      disabled={Boolean(busyUserId)}
                      onClick={() => void toggleUserActive(user)}
                    >
                      {user.active ? "To'xtatish" : "Faollashtirish"}
                    </button>
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
