import { clsx } from "clsx";

export function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold",
        enabled
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}
