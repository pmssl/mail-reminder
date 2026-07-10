import type { CreateReminderInput, Reminder, ReminderListFilters, UpdateReminderInput } from "@shared/types/reminder";

export interface ApiMeta {
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  meta?: ApiMeta;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function listReminders(filters: ReminderListFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return request<Reminder[]>(`/api/reminders?${params.toString()}`);
}

export function getReminder(id: string) {
  return request<Reminder>(`/api/reminders/${id}`);
}

export function createReminder(input: CreateReminderInput) {
  return request<Reminder>("/api/reminders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateReminder(id: string, input: UpdateReminderInput) {
  return request<Reminder>(`/api/reminders/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteReminder(id: string) {
  return request<{ deleted: boolean }>(`/api/reminders/${id}`, {
    method: "DELETE",
  });
}

export function testReminder(id: string) {
  return request<{ provider: string; messageId?: string }>(`/api/reminders/${id}/test`, {
    method: "POST",
  });
}

export function healthCheck() {
  return request<{ ok: boolean; service: string }>("/api/health");
}

export function sendSettingsTestEmail(email: string) {
  return request<{ provider: string; messageId?: string; emailId?: number; accountId?: number; sendEmail?: string; status?: number }>("/api/email/test", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta?: ApiMeta }> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const apiToken = import.meta.env.VITE_API_TOKEN;
  if (apiToken) {
    headers.set("Authorization", apiToken);
  }

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload || payload.code >= 400) {
    throw new ApiError(payload?.message ?? `Request failed with HTTP ${response.status}`, response.status, payload?.details);
  }

  return {
    data: payload.data,
    meta: payload.meta,
  };
}
