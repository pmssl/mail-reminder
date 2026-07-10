const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): boolean {
  return datePattern.test(value) && formatUtcDate(parseUtcDate(value)) === value;
}

export function parseUtcDate(value: string): Date {
  if (!datePattern.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtcDate(timestamp = Date.now()): string {
  return formatUtcDate(new Date(timestamp));
}

export function addDaysUtc(value: string, days: number): string {
  const date = parseUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function addMonthsUtc(value: string, months: number): string {
  const date = parseUtcDate(value);
  const originalDay = date.getUTCDate();
  const targetMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();

  targetMonthStart.setUTCDate(Math.min(originalDay, lastDay));
  return formatUtcDate(targetMonthStart);
}

export function addYearsUtc(value: string, years: number): string {
  const date = parseUtcDate(value);
  const originalMonth = date.getUTCMonth();
  const originalDay = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear() + years, originalMonth, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), originalMonth + 1, 0)).getUTCDate();

  target.setUTCDate(Math.min(originalDay, lastDay));
  return formatUtcDate(target);
}

export function toIsoTimestamp(date = new Date()): string {
  return date.toISOString();
}
