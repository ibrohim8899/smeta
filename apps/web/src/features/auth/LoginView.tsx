import { useEffect, useState } from "react";
import { LogIn, RefreshCw, Send, X } from "lucide-react";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@smeta/shared";
import {
  cancelBrowserLogin,
  createBrowserLogin,
  pollBrowserLogin,
  storeSessionToken,
  type AuthSessionResponse,
  type BrowserLoginResponse
} from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";

const PENDING_BROWSER_LOGIN_KEY = "smeta-pending-browser-login";

type LoginViewProps = {
  onAuthenticated: (session: AuthSessionResponse) => void;
  onGuestRequest: () => void;
  sessionMessage?: string | null;
};

export function LoginView({ onAuthenticated, onGuestRequest, sessionMessage }: LoginViewProps) {
  const [requestedRole, setRequestedRole] = useState<UserRole>("dealer");
  const [login, setLogin] = useState<BrowserLoginResponse | null>(null);
  const [status, setStatus] = useState("not_started");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pendingLogin = window.localStorage.getItem(PENDING_BROWSER_LOGIN_KEY);

    if (!pendingLogin) {
      return;
    }

    try {
      const parsed = JSON.parse(pendingLogin) as BrowserLoginResponse;
      setLogin(parsed);
      setStatus(parsed.status);

      if (shouldAutoPoll(parsed)) {
        void pollSavedLogin(parsed);
      }
    } catch {
      window.localStorage.removeItem(PENDING_BROWSER_LOGIN_KEY);
    }
  }, []);

  useEffect(() => {
    if (!login || !shouldAutoPoll(login) || status === "authenticated" || status === "canceled" || status === "expired") {
      return;
    }

    const timer = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [login, status]);

  async function startLogin() {
    try {
      setBusy(true);
      const nextLogin = await createBrowserLogin(requestedRole);
      setLogin(nextLogin);
      setStatus(nextLogin.status);
      setError(null);
      window.localStorage.setItem(PENDING_BROWSER_LOGIN_KEY, JSON.stringify(nextLogin));
      openTelegramLogin(nextLogin);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login link yaratilmadi");
    } finally {
      setBusy(false);
    }
  }

  function openTelegramLogin(nextLogin = login) {
    if (!nextLogin) {
      return;
    }

    const appLink = nextLogin.appLink ?? nextLogin.deepLink;
    window.location.assign(appLink);
  }

  async function poll() {
    if (!login) {
      return;
    }

    try {
      const result = await pollBrowserLogin(login.nonce);
      setStatus(result.status);

      if (result.status === "authenticated") {
        storeSessionToken(result.accessToken);
        window.localStorage.removeItem(PENDING_BROWSER_LOGIN_KEY);
        onAuthenticated(result.session);
      }
    } catch (pollError) {
      setError(pollError instanceof Error ? pollError.message : "Login holatini olishda xatolik bo'ldi");
    }
  }

  async function cancel() {
    if (!login) {
      return;
    }

    await cancelBrowserLogin(login.nonce);
    window.localStorage.removeItem(PENDING_BROWSER_LOGIN_KEY);
    setStatus("canceled");
  }

  async function pollSavedLogin(savedLogin: BrowserLoginResponse) {
    try {
      const result = await pollBrowserLogin(savedLogin.nonce);
      setStatus(result.status);

      if (result.status === "authenticated") {
        storeSessionToken(result.accessToken);
        window.localStorage.removeItem(PENDING_BROWSER_LOGIN_KEY);
        onAuthenticated(result.session);
      }

      if (result.status === "canceled" || result.status === "expired" || result.status === "consumed") {
        window.localStorage.removeItem(PENDING_BROWSER_LOGIN_KEY);
      }
    } catch (pollError) {
      setError(pollError instanceof Error ? pollError.message : "Login holatini olishda xatolik bo'ldi");
    }
  }

  return (
    <main className="min-h-screen bg-smeta-paper px-5 py-8 text-smeta-ink">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeta-mauve">Smeta Market</p>
          <h1 className="mt-3 text-3xl font-semibold">Platformaga Telegram orqali kiring</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-smeta-mauve">
            Dealer, do'kon, admin va moliya rollari Telegram orqali tasdiqlanadi. Mijoz esa ro'yxatdan o'tmasdan material so'rovi yuborishi mumkin.
          </p>

          <div className="mt-6">
            <button className="w-full rounded-md bg-smeta-deep px-4 py-3 text-left text-sm font-semibold text-white sm:w-auto sm:min-w-64" onClick={onGuestRequest}>
              Mijoz so'rovi yuborish
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-smeta-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-smeta-soft p-2 text-smeta-clay">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Login</h2>
              <p className="text-sm text-smeta-mauve">Kerakli rolni tanlab Telegramdan tasdiqlang.</p>
            </div>
          </div>

          <label className="mt-5 block text-sm font-semibold" htmlFor="login-role">
            Rol
          </label>
          <select
            className="mt-2 w-full rounded-md border border-smeta-line bg-white px-3 py-2 text-sm outline-none focus:border-smeta-clay"
            id="login-role"
            value={requestedRole}
            onChange={(event) => setRequestedRole(event.target.value as UserRole)}
          >
            {USER_ROLES.filter((role) => role !== "customer").map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>

          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-smeta-ink px-4 py-3 text-sm font-bold text-white" disabled={busy} onClick={() => void startLogin()}>
            <Send className="h-4 w-4" />
            Telegramga o'tish
          </button>

          {sessionMessage ? <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{sessionMessage}</p> : null}

          {login ? (
            <div className="mt-4 rounded-md border border-smeta-line bg-smeta-paper p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-smeta-mauve">Holat: {formatStatusLabel(status)}</p>
              <p className="mt-2 text-sm text-smeta-mauve">Telegram botdagi tasdiqlash xabaridan platformaga qayting.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="flex items-center gap-2 rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-bold" onClick={() => openTelegramLogin()}>
                  <Send className="h-4 w-4" />
                  Telegramni ochish
                </button>
                <a className="flex items-center gap-2 rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-bold" href={login.qrPayload}>
                  Web orqali ochish
                </a>
                <button className="flex items-center gap-2 rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-bold" onClick={() => void poll()}>
                  <RefreshCw className="h-4 w-4" />
                  Tekshirish
                </button>
                <button className="flex items-center gap-2 rounded-md border border-smeta-line bg-white px-3 py-2 text-sm font-bold" onClick={() => void cancel()}>
                  <X className="h-4 w-4" />
                  Bekor qilish
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}

function shouldAutoPoll(login: BrowserLoginResponse) {
  if (!login.returnUrl) {
    return true;
  }

  try {
    return new URL(login.returnUrl).origin === window.location.origin;
  } catch {
    return true;
  }
}
