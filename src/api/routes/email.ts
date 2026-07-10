import { Hono } from "hono";
import { z } from "zod";
import { EmailService } from "@shared/services/email/emailService";
import type { Env } from "@shared/types/env";
import type { Reminder } from "@shared/types/reminder";
import { todayUtcDate, toIsoTimestamp } from "@shared/utils/dates";
import { failure, success } from "../response";

const testEmailSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const emailRoute = new Hono<{ Bindings: Env }>();

emailRoute.post("/test", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = testEmailSchema.safeParse(body);
  if (!parsed.success) {
    return failure(c, 422, "Validation failed", parsed.error.flatten());
  }

  const now = toIsoTimestamp();
  const today = todayUtcDate();
  const reminder: Reminder = {
    id: "settings-test",
    title: "Mail Reminder test",
    email: parsed.data.email,
    subject: "Mail Reminder test email",
    content: "This is a test email from Mail Reminder settings.",
    repeat_type: "once",
    repeat_value: 1,
    start_date: today,
    next_run: today,
    enabled: true,
    created_at: now,
    updated_at: now,
  };

  const result = await EmailService.fromEnv(c.env).sendReminder(reminder);
  return success(c, result);
});
