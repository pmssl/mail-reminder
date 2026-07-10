import type {
  CreateReminderInput,
  PaginatedReminders,
  Reminder,
  ReminderListFilters,
  ReminderRecord,
  UpdateReminderInput,
} from "@shared/types/reminder";
import { calculateInitialNextRun, calculateNextRunFromSchedule, normalizeRepeatValue } from "@shared/utils/repeat";
import { todayUtcDate, toIsoTimestamp } from "@shared/utils/dates";

function mapReminder(record: ReminderRecord): Reminder {
  return {
    ...record,
    enabled: record.enabled === 1,
  };
}

export class ReminderRepository {
  constructor(private readonly db: D1Database) {}

  async list(filters: ReminderListFilters = {}): Promise<PaginatedReminders> {
    const where: string[] = [];
    const bindings: unknown[] = [];
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    if (filters.status === "enabled") {
      where.push("enabled = 1");
    } else if (filters.status === "disabled") {
      where.push("enabled = 0");
    }

    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;
      where.push("(title LIKE ? OR email LIKE ? OR subject LIKE ?)");
      bindings.push(search, search, search);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const countRow = await this.db
      .prepare(`SELECT COUNT(*) AS total FROM reminders ${whereSql}`)
      .bind(...bindings)
      .first<{ total: number }>();
    const result = await this.db
      .prepare(
        `SELECT * FROM reminders ${whereSql}
         ORDER BY next_run IS NULL, next_run ASC, enabled DESC, updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...bindings, pageSize, offset)
      .all<ReminderRecord>();

    return {
      reminders: result.results.map(mapReminder),
      total: countRow?.total ?? 0,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Reminder | null> {
    const record = await this.db
      .prepare("SELECT * FROM reminders WHERE id = ?")
      .bind(id)
      .first<ReminderRecord>();

    return record ? mapReminder(record) : null;
  }

  async create(input: CreateReminderInput): Promise<Reminder> {
    const now = toIsoTimestamp();
    const id = crypto.randomUUID();
    const repeatValue = normalizeRepeatValue(input.repeat_value);
    const nextRun =
      input.next_run === undefined
        ? calculateInitialNextRun(input.start_date, input.repeat_type, repeatValue)
        : input.next_run;

    await this.db
      .prepare(
        `INSERT INTO reminders (
          id, title, email, subject, content, repeat_type, repeat_value,
          start_date, next_run, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.title,
        input.email,
        input.subject,
        input.content,
        input.repeat_type,
        repeatValue,
        input.start_date,
        nextRun,
        input.enabled === false ? 0 : 1,
        now,
        now,
      )
      .run();

    const reminder = await this.findById(id);
    if (!reminder) {
      throw new Error("Reminder was not created");
    }

    return reminder;
  }

  async update(id: string, input: UpdateReminderInput): Promise<Reminder | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const fields: string[] = [];
    const bindings: unknown[] = [];
    const repeatType = input.repeat_type ?? existing.repeat_type;
    const repeatValue = normalizeRepeatValue(input.repeat_value ?? existing.repeat_value);
    const startDate = input.start_date ?? existing.start_date;
    const finalEnabled = input.enabled ?? existing.enabled;
    const scheduleChanged =
      input.start_date !== undefined ||
      input.repeat_type !== undefined ||
      input.repeat_value !== undefined;
    const formSaveIncludesNextRun = input.next_run !== undefined;
    const shouldRecalculateNextRun =
      finalEnabled && (!existing.enabled || scheduleChanged || formSaveIncludesNextRun);
    const nextRun = shouldRecalculateNextRun
      ? calculateNextRunFromSchedule(startDate, repeatType, repeatValue, todayUtcDate())
      : input.next_run;

    this.addField(fields, bindings, "title", input.title);
    this.addField(fields, bindings, "email", input.email);
    this.addField(fields, bindings, "subject", input.subject);
    this.addField(fields, bindings, "content", input.content);
    this.addField(fields, bindings, "repeat_type", input.repeat_type);
    this.addField(fields, bindings, "repeat_value", input.repeat_value && repeatValue);
    this.addField(fields, bindings, "start_date", input.start_date);
    this.addField(fields, bindings, "next_run", nextRun);

    if (input.enabled !== undefined) {
      fields.push("enabled = ?");
      bindings.push(input.enabled ? 1 : 0);
    }

    if (fields.length > 0) {
      fields.push("updated_at = ?");
      bindings.push(toIsoTimestamp(), id);

      await this.db
        .prepare(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`)
        .bind(...bindings)
        .run();
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM reminders WHERE id = ?").bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }

  async findDue(today: string, limit = 1000): Promise<Reminder[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM reminders
         WHERE enabled = 1 AND next_run IS NOT NULL AND next_run <= ?
         ORDER BY next_run ASC
         LIMIT ?`,
      )
      .bind(today, limit)
      .all<ReminderRecord>();

    return result.results.map(mapReminder);
  }

  async scheduleAfterSend(id: string, nextRun: string | null): Promise<void> {
    await this.db
      .prepare("UPDATE reminders SET next_run = ?, enabled = ?, updated_at = ? WHERE id = ?")
      .bind(nextRun, nextRun === null ? 0 : 1, toIsoTimestamp(), id)
      .run();
  }

  private addField(fields: string[], bindings: unknown[], column: string, value: unknown): void {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      bindings.push(value);
    }
  }
}
