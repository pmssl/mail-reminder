import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import type { CreateReminderInput, Reminder, RepeatType } from "@shared/types/reminder";
import { calculateInitialNextRun } from "@shared/utils/repeat";
import { Button } from "./Button";

const today = new Date().toISOString().slice(0, 10);

type ReminderFormValue = CreateReminderInput;

interface ReminderFormProps {
  initialReminder?: Reminder | null;
  saving: boolean;
  onSubmit: (value: ReminderFormValue) => Promise<void>;
  onCancel: () => void;
}

const repeatOptions: Array<{ value: RepeatType; label: string }> = [
  { value: "once", label: "Once" },
  { value: "days", label: "Every X days" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function ReminderForm({ initialReminder, saving, onSubmit, onCancel }: ReminderFormProps) {
  const [value, setValue] = useState<ReminderFormValue>(() => toFormValue(initialReminder));
  const [nextRunTouched, setNextRunTouched] = useState(Boolean(initialReminder));

  useEffect(() => {
    setValue(toFormValue(initialReminder));
    setNextRunTouched(Boolean(initialReminder));
  }, [initialReminder]);

  const repeatUnit = value.repeat_type === "days" ? "days" : value.repeat_type === "weekly" ? "weeks" : value.repeat_type === "monthly" ? "months" : "years";
  const showRepeatValue = value.repeat_type !== "once";

  return (
    <form
      className="max-w-4xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          ...value,
          repeat_value: value.repeat_type === "once" ? 1 : Number(value.repeat_value || 1),
        });
      }}
    >
      <section className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-ink-900 sm:grid-cols-2">
        <Field label="Title">
          <input
            required
            value={value.title}
            onChange={(event) => setValue((current) => ({ ...current, title: event.target.value }))}
            className={inputClass}
            placeholder="Check my VPS"
          />
        </Field>
        <Field label="Recipient Email">
          <input
            required
            type="email"
            value={value.email}
            onChange={(event) => setValue((current) => ({ ...current, email: event.target.value }))}
            className={inputClass}
            placeholder="me@example.com"
          />
        </Field>
        <Field label="Subject" className="sm:col-span-2">
          <input
            required
            value={value.subject}
            onChange={(event) => setValue((current) => ({ ...current, subject: event.target.value }))}
            className={inputClass}
            placeholder="Time to check the VPS"
          />
        </Field>
        <Field label="Content" className="sm:col-span-2">
          <textarea
            required
            rows={8}
            value={value.content}
            onChange={(event) => setValue((current) => ({ ...current, content: event.target.value }))}
            className={inputClass}
            placeholder="Run updates, check disk usage, and confirm backups."
          />
        </Field>
      </section>

      <section className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-ink-900 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Start Date">
          <input
            required
            type="date"
            value={value.start_date}
            onChange={(event) =>
              setValue((current) =>
                applyAutoNextRun(
                  {
                    ...current,
                    start_date: event.target.value,
                  },
                  nextRunTouched,
                ),
              )
            }
            className={inputClass}
          />
        </Field>
        <Field label="Next Run">
          <input
            required
            type="date"
            value={value.next_run ?? value.start_date}
            onChange={(event) => {
              setNextRunTouched(true);
              setValue((current) => ({ ...current, next_run: event.target.value }));
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Repeat">
          <select
            value={value.repeat_type}
            onChange={(event) =>
              setValue((current) =>
                applyAutoNextRun(
                  {
                    ...current,
                    repeat_type: event.target.value as RepeatType,
                    repeat_value: event.target.value === "once" ? 1 : current.repeat_value || 1,
                  },
                  nextRunTouched,
                ),
              )
            }
            className={inputClass}
          >
            {repeatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {showRepeatValue ? (
          <Field label={`Interval (${repeatUnit})`}>
            <input
              required
              min={1}
              type="number"
              value={value.repeat_value ?? 1}
              onChange={(event) =>
                setValue((current) =>
                  applyAutoNextRun(
                    {
                      ...current,
                      repeat_value: Number(event.target.value),
                    },
                    nextRunTouched,
                  ),
                )
              }
              className={inputClass}
            />
          </Field>
        ) : (
          <div className="flex items-end">
            <label className="flex min-h-11 w-full items-center gap-3 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700">
              <input
                type="checkbox"
                checked={value.enabled ?? true}
                onChange={(event) => setValue((current) => ({ ...current, enabled: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Enabled
            </label>
          </div>
        )}
        {showRepeatValue ? (
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700 lg:col-start-4">
            <input
              type="checkbox"
              checked={value.enabled ?? true}
              onChange={(event) => setValue((current) => ({ ...current, enabled: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Enabled
          </label>
        ) : null}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" onClick={onCancel} icon={<X className="h-4 w-4" />}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving} icon={<Save className="h-4 w-4" />}>
          {saving ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function toFormValue(reminder?: Reminder | null): ReminderFormValue {
  const repeatType = reminder?.repeat_type ?? "days";
  const repeatValue = reminder?.repeat_value ?? 90;
  const startDate = reminder?.start_date ?? today;

  return {
    title: reminder?.title ?? "",
    email: reminder?.email ?? "",
    subject: reminder?.subject ?? "",
    content: reminder?.content ?? "",
    repeat_type: repeatType,
    repeat_value: repeatValue,
    start_date: startDate,
    next_run: reminder?.next_run ?? calculateInitialNextRun(startDate, repeatType, repeatValue),
    enabled: reminder?.enabled ?? true,
  };
}

function applyAutoNextRun(value: ReminderFormValue, nextRunTouched: boolean): ReminderFormValue {
  if (nextRunTouched) {
    return value;
  }

  return {
    ...value,
    next_run: calculateInitialNextRun(value.start_date, value.repeat_type, value.repeat_value),
  };
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "min-h-11 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700";
