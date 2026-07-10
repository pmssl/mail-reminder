export const repeatTypes = ["once", "days", "weekly", "monthly", "yearly"] as const;

export type RepeatType = (typeof repeatTypes)[number];

export interface Reminder {
  id: string;
  title: string;
  email: string;
  subject: string;
  content: string;
  repeat_type: RepeatType;
  repeat_value: number;
  start_date: string;
  next_run: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderRecord {
  id: string;
  title: string;
  email: string;
  subject: string;
  content: string;
  repeat_type: RepeatType;
  repeat_value: number;
  start_date: string;
  next_run: string | null;
  enabled: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  title: string;
  email: string;
  subject: string;
  content: string;
  repeat_type: RepeatType;
  repeat_value?: number;
  start_date: string;
  next_run?: string | null;
  enabled?: boolean;
}

export type UpdateReminderInput = Partial<CreateReminderInput>;

export interface ReminderListFilters {
  search?: string;
  status?: "enabled" | "disabled" | "all";
  page?: number;
  pageSize?: number;
}

export interface PaginatedReminders {
  reminders: Reminder[];
  total: number;
  page: number;
  pageSize: number;
}
