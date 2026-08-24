import { useEffect, useState } from "react";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { APP_TIMEZONE, ROLE_LABELS, type UserRole } from "@smeta/shared";
import { IconButton } from "../components/ui/IconButton";
import { SearchBox } from "../components/ui/SearchBox";
import { navigationItems } from "./navigation";
import type { AuthSessionResponse } from "../lib/api";
import type { ViewKey } from "../types/navigation";

type AppShellProps = {
  activeView: ViewKey;
  children: React.ReactNode;
  session: AuthSessionResponse;
  onLogout: () => void;
  onRoleSwitch: (role: UserRole) => void;
  onSearchChange: (query: string) => void;
  onViewChange: (view: ViewKey) => void;
  searchQuery: string;
};

export function AppShell({ activeView, children, session, onLogout, onRoleSwitch, onSearchChange, onViewChange, searchQuery }: AppShellProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("smeta-theme");
    const preferredDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : preferredDark ? "dark" : "light";

    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("smeta-theme", theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const visibleNavigation = navigationItems.filter((item) => (item.roles as readonly UserRole[]).includes(session.role as UserRole));
  const displayName = compactAccountName(session.displayName);

  return (
    <main className="min-h-screen bg-smeta-paper text-smeta-ink" data-theme={theme}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,_rgb(var(--smeta-blush)/0.20),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgb(var(--smeta-rose)/0.15),_transparent_32%)]" />
      <div className="relative min-h-screen">
        <aside className="border-b border-smeta-line bg-smeta-deep px-4 py-4 text-white shadow-smeta lg:fixed lg:left-0 lg:top-0 lg:z-20 lg:h-screen lg:w-[272px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeta-blush">Smeta Market</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">V1 boshqaruv</h1>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-smeta-blush lg:mt-6">
              {APP_TIMEZONE}
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {visibleNavigation.map(({ key, label, icon: Icon }) => {
              const active = activeView === key;
              return (
                <button
                  key={key}
                  className={`flex min-w-fit items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                    active ? "bg-smeta-clay text-white" : "text-smeta-blush"
                  }`}
                  onClick={() => onViewChange(key)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 lg:ml-[272px]">
          <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-smeta-line bg-smeta-surface/90 px-5 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeta-mauve">Xarid jarayoni</p>
              <h2 className="mt-1 text-2xl font-semibold">Material so'rovidan to'lovgacha</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox value={searchQuery} onChange={onSearchChange} />
              <div className="flex items-center gap-2 rounded-md border border-smeta-line bg-white px-3 py-2 text-sm">
                <div>
                  <p className="max-w-24 text-xs font-semibold text-smeta-mauve" title={session.displayName}>
                    {displayName}
                  </p>
                  <p className="font-semibold">{session.roleLabel}</p>
                </div>
                {session.approvedRoles.length > 1 ? (
                  <select
                    className="rounded-md border border-smeta-line bg-white px-2 py-1 text-xs outline-none focus:border-smeta-clay"
                    value={session.role}
                    onChange={(event) => onRoleSwitch(event.target.value as UserRole)}
                  >
                    {session.approvedRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role as UserRole] ?? role}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <IconButton label={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(nextTheme)}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </IconButton>
              <IconButton label="Bildirishnomalar" onClick={() => onViewChange("notifications")}>
                <Bell className="h-4 w-4" />
              </IconButton>
              <IconButton label="Chiqish" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </IconButton>
            </div>
          </header>

          <div className="mx-auto max-w-[1680px] px-5 py-5 lg:px-7">{children}</div>
        </section>
      </div>
    </main>
  );
}

function compactAccountName(name: string, maxLength = 9) {
  const trimmed = name.trim();
  const characters = Array.from(trimmed);

  if (characters.length <= maxLength) {
    return trimmed;
  }

  return `${characters.slice(0, maxLength).join("")}...`;
}
