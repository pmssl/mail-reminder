import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Edit3, MailCheck, Plus, Search, Send, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { Reminder } from "@shared/types/reminder";
import { describeRepeat } from "@shared/utils/repeat";
import { deleteReminder, listReminders, testReminder, updateReminder, type ApiMeta } from "@frontend/api/client";
import { Button } from "@frontend/components/Button";
import { IconButton } from "@frontend/components/IconButton";
import { StatusPill } from "@frontend/components/StatusPill";

export function DashboardPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({ total: 0, page: 1, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listReminders({ search, status, page: meta.page, pageSize: meta.pageSize });
      setReminders(result.data);
      setMeta((current) => result.meta ?? current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const enabledCount = useMemo(() => reminders.filter((reminder) => reminder.enabled).length, [reminders]);
  const nextRun = useMemo(
    () => reminders.filter((reminder) => reminder.enabled && reminder.next_run).sort((a, b) => (a.next_run ?? "").localeCompare(b.next_run ?? ""))[0]?.next_run,
    [reminders],
  );

  async function handleDelete(reminder: Reminder) {
    if (!window.confirm(`Delete "${reminder.title}"?`)) return;
    await deleteReminder(reminder.id);
    setNotice("Reminder deleted");
    await load();
  }

  async function handleToggle(reminder: Reminder) {
    await updateReminder(reminder.id, { enabled: !reminder.enabled });
    setNotice(reminder.enabled ? "Reminder disabled" : "Reminder enabled");
    await load();
  }

  async function handleTest(reminder: Reminder) {
    const result = await testReminder(reminder.id);
    setNotice(`Test email sent with ${result.data.provider}`);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total" value={meta.total.toString()} />
        <Metric label="Enabled on page" value={enabledCount.toString()} />
        <Metric label="Next run" value={nextRun ?? "None"} accent />
      </div>

      <section className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-ink-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setMeta((current) => ({ ...current, page: 1 }));
                }}
                className="min-h-11 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700"
                placeholder="Search reminders"
              />
            </label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | "enabled" | "disabled");
                setMeta((current) => ({ ...current, page: 1 }));
              }}
              className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700"
            >
              <option value="all">All statuses</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <Link
            to="/reminders/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-950 lg:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Reminder
          </Link>
        </div>

        {notice ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{notice}</p> : null}
        {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p> : null}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-3 font-semibold">Title</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Next Run</th>
                <th className="px-3 py-3 font-semibold">Repeat Interval</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((reminder) => (
                <tr key={reminder.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="max-w-64 px-3 py-4 font-medium">{reminder.title}</td>
                  <td className="px-3 py-4 text-slate-600 dark:text-slate-300">{reminder.email}</td>
                  <td className="px-3 py-4">{reminder.next_run ?? "Done"}</td>
                  <td className="px-3 py-4">{describeRepeat(reminder.repeat_type, reminder.repeat_value)}</td>
                  <td className="px-3 py-4">
                    <StatusPill enabled={reminder.enabled} />
                  </td>
                  <td className="px-3 py-4">
                    <Actions reminder={reminder} onDelete={handleDelete} onTest={handleTest} onToggle={handleToggle} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {reminders.map((reminder) => (
            <article key={reminder.id} className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{reminder.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{reminder.email}</p>
                </div>
                <StatusPill enabled={reminder.enabled} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Next Run</dt>
                  <dd className="font-medium">{reminder.next_run ?? "Done"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Repeat</dt>
                  <dd className="font-medium">{describeRepeat(reminder.repeat_type, reminder.repeat_value)}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Actions reminder={reminder} onDelete={handleDelete} onTest={handleTest} onToggle={handleToggle} />
              </div>
            </article>
          ))}
        </div>

        {!loading && reminders.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 text-center dark:border-slate-700">
            <MailCheck className="h-10 w-10 text-slate-400" />
            <p className="mt-3 font-medium">No reminders found</p>
          </div>
        ) : null}

        {loading ? <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading reminders...</p> : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {meta.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button disabled={meta.page <= 1} onClick={() => setMeta((current) => ({ ...current, page: current.page - 1 }))}>
              Previous
            </Button>
            <Button disabled={meta.page >= totalPages} onClick={() => setMeta((current) => ({ ...current, page: current.page + 1 }))}>
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-ink-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={accent ? "mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-300" : "mt-2 text-2xl font-semibold"}>{value}</p>
    </section>
  );
}

function Actions({
  reminder,
  onDelete,
  onToggle,
  onTest,
}: {
  reminder: Reminder;
  onDelete: (reminder: Reminder) => Promise<void>;
  onToggle: (reminder: Reminder) => Promise<void>;
  onTest: (reminder: Reminder) => Promise<void>;
}) {
  return (
    <div className="flex justify-end gap-2">
      <IconButton label="Send test email" onClick={() => void onTest(reminder)}>
        <Send className="h-4 w-4" />
      </IconButton>
      <IconButton label={reminder.enabled ? "Disable reminder" : "Enable reminder"} onClick={() => void onToggle(reminder)}>
        {reminder.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
      </IconButton>
      <Link
        to={`/reminders/${reminder.id}/edit`}
        aria-label="Edit reminder"
        title="Edit reminder"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-ink-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-ink-950"
      >
        <Edit3 className="h-4 w-4" />
      </Link>
      <IconButton label="Delete reminder" variant="danger" onClick={() => void onDelete(reminder)}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
