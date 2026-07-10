import type { Reminder, RepeatType } from "@shared/types/reminder";
import { addDaysUtc, addMonthsUtc, addYearsUtc } from "./dates";

type ScheduleReminder = Pick<Reminder, "repeat_type" | "repeat_value" | "start_date" | "next_run">;

interface RepeatRule {
  next(currentRun: string, value: number): string | null;
  label(value: number): string;
}

function plural(value: number, singular: string, pluralValue = `${singular}s`): string {
  return value === 1 ? singular : pluralValue;
}

export const repeatRules: Record<RepeatType, RepeatRule> = {
  once: {
    next: () => null,
    label: () => "Once",
  },
  days: {
    next: (currentRun, value) => addDaysUtc(currentRun, value),
    label: (value) => `Every ${value} ${plural(value, "day")}`,
  },
  weekly: {
    next: (currentRun, value) => addDaysUtc(currentRun, value * 7),
    label: (value) => (value === 1 ? "Weekly" : `Every ${value} weeks`),
  },
  monthly: {
    next: (currentRun, value) => addMonthsUtc(currentRun, value),
    label: (value) => (value === 1 ? "Monthly" : `Every ${value} months`),
  },
  yearly: {
    next: (currentRun, value) => addYearsUtc(currentRun, value),
    label: (value) => (value === 1 ? "Yearly" : `Every ${value} years`),
  },
};

export function describeRepeat(type: RepeatType, value = 1): string {
  return repeatRules[type].label(normalizeRepeatValue(value));
}

export function normalizeRepeatValue(value?: number | null): number {
  return Math.max(1, Math.floor(value ?? 1));
}

export function calculateInitialNextRun(startDate: string, type: RepeatType, value = 1): string {
  if (type === "once") {
    return startDate;
  }

  const nextRun = repeatRules[type].next(startDate, normalizeRepeatValue(value));
  if (nextRun === null) {
    return startDate;
  }

  return nextRun;
}

export function calculateNextRunFromSchedule(
  startDate: string,
  type: RepeatType,
  value: number,
  asOfDate: string,
): string {
  if (type === "once") {
    return startDate;
  }

  const repeatValue = normalizeRepeatValue(value);
  let candidate = calculateInitialNextRun(startDate, type, repeatValue);

  for (let attempt = 0; attempt < 10000; attempt += 1) {
    if (candidate >= asOfDate) {
      return candidate;
    }

    const nextCandidate = repeatRules[type].next(candidate, repeatValue);
    if (nextCandidate === null) {
      return candidate;
    }

    candidate = nextCandidate;
  }

  throw new Error("Unable to calculate next reminder date from schedule");
}

export function calculateNextRunAfter(reminder: ScheduleReminder, asOfDate: string): string | null {
  const rule = repeatRules[reminder.repeat_type];
  let nextRun = reminder.next_run ?? reminder.start_date;
  const repeatValue = normalizeRepeatValue(reminder.repeat_value);

  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const candidate = rule.next(nextRun, repeatValue);

    if (candidate === null) {
      return null;
    }

    if (candidate > asOfDate) {
      return candidate;
    }

    nextRun = candidate;
  }

  throw new Error("Unable to calculate a future reminder date");
}
