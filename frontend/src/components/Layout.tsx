import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BellRing, LayoutDashboard, Moon, Plus, Settings, Sun } from "lucide-react";
import { clsx } from "clsx";
import { IconButton } from "./IconButton";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reminders/new", label: "New", icon: Plus },
  { to: "/settings", label: "Settings", icon: Settings },
];

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/reminders/new": "New Reminder",
  "/settings": "Settings",
};

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("mail-reminder.theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("mail-reminder.theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const title = titles[location.pathname] ?? (location.pathname.includes("/edit") ? "Edit Reminder" : "Mail Reminder");

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-ink-900 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-600 text-white">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mail</p>
            <h1 className="text-lg font-semibold">Reminder</h1>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-ink-950/95">
          <div className="flex min-h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-600 text-white lg:hidden">
                <BellRing className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <IconButton label={darkMode ? "Use light mode" : "Use dark mode"} onClick={() => setDarkMode((value) => !value)}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </IconButton>
            </div>
          </div>
          <nav className="grid grid-cols-3 border-t border-slate-200 dark:border-slate-800 lg:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "flex min-h-12 items-center justify-center gap-2 text-sm font-medium",
                    isActive ? "text-teal-700 dark:text-teal-300" : "text-slate-600 dark:text-slate-300",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
