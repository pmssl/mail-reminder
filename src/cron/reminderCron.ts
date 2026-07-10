import { ReminderRepository } from "@shared/repositories/reminderRepository";
import type { Env } from "@shared/types/env";
import { todayUtcDate } from "@shared/utils/dates";
import { calculateNextRunAfter } from "@shared/utils/repeat";
import { EmailService } from "@shared/services/email/emailService";

export interface CronRunResult {
  today: string;
  total: number;
  sent: number;
  failed: number;
  disabled: number;
}

export async function runReminderCron(env: Env, scheduledTime = Date.now()): Promise<CronRunResult> {
  const today = todayUtcDate(scheduledTime);
  const repository = new ReminderRepository(env.DB);
  const dueReminders = await repository.findDue(today);
  const result: CronRunResult = {
    today,
    total: dueReminders.length,
    sent: 0,
    failed: 0,
    disabled: 0,
  };

  if (dueReminders.length === 0) {
    return result;
  }

  const emailService = EmailService.fromEnv(env);

  for (const reminder of dueReminders) {
    try {
      await emailService.sendReminder(reminder);
      const nextRun = calculateNextRunAfter(reminder, today);
      await repository.scheduleAfterSend(reminder.id, nextRun);
      result.sent += 1;

      if (nextRun === null) {
        result.disabled += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error("Failed to send reminder", {
        reminderId: reminder.id,
        title: reminder.title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
