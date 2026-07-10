import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "neutral" | "danger";
  children: ReactNode;
}

export function IconButton({ label, variant = "neutral", children, className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-950",
        variant === "neutral" &&
          "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-ink-900 dark:text-slate-200 dark:hover:bg-slate-800",
        variant === "danger" &&
          "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
