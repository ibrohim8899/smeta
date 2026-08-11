import { Bell } from "lucide-react";
import { APP_TIMEZONE } from "@smeta/shared";
import { IconButton } from "../components/ui/IconButton";
import { SearchBox } from "../components/ui/SearchBox";
import { navigationItems } from "./navigation";
import type { ViewKey } from "../types/navigation";

type AppShellProps = {
  activeView: ViewKey;
  children: React.ReactNode;
  onViewChange: (view: ViewKey) => void;
};

export function AppShell({ activeView, children, onViewChange }: AppShellProps) {
  return (
    <main className="min-h-screen bg-smeta-paper text-smeta-ink">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-smeta-line bg-smeta-ink px-4 py-4 text-white lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeta-blush">Smeta Market</p>
              <h1 className="mt-2 text-xl font-semibold">V1 boshqaruv</h1>
            </div>
            <div className="rounded-md border border-white/15 px-3 py-2 text-xs text-smeta-blush lg:mt-6">
              {APP_TIMEZONE}
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {navigationItems.map(({ key, label, icon: Icon }) => {
              const active = activeView === key;
              return (
                <button
                  key={key}
                  className={`flex min-w-fit items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${
                    active ? "bg-smeta-clay text-white" : "text-smeta-blush hover:bg-white/8"
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

        <section className="min-w-0">
          <header className="flex flex-col gap-4 border-b border-smeta-line bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-smeta-mauve">Xarid jarayoni</p>
              <h2 className="mt-1 text-2xl font-semibold">Material so'rovidan to'lovgacha</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchBox />
              <IconButton label="Bildirishnomalar" onClick={() => onViewChange("notifications")}>
                <Bell className="h-4 w-4" />
              </IconButton>
            </div>
          </header>

          <div className="px-5 py-5 lg:px-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
