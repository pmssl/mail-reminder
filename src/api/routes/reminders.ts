import { Hono } from "hono";
import { z } from "zod";
import { ReminderRepository } from "@shared/repositories/reminderRepository";
import { EmailService } from "@shared/services/email/emailService";
import type { Env } from "@shared/types/env";
import { createReminderSchema, updateReminderSchema } from "../validators/reminder";
import { failure, success } from "../response";

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["enabled", "disabled", "all"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const remindersRoute = new Hono<{ Bindings: Env }>();

remindersRoute.get("/", async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const repository = new ReminderRepository(c.env.DB);
  const result = await repository.list(query);

  return success(c, result.reminders, 200, {
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});

remindersRoute.post("/", async (c) => {
  const body = await parseJson(c.req.raw);
  const parsed = createReminderSchema.safeParse(body);
  if (!parsed.success) {
    return failure(c, 422, "Validation failed", parsed.error.flatten());
  }

  const repository = new ReminderRepository(c.env.DB);
  const reminder = await repository.create(parsed.data);
  return success(c, reminder, 201);
});

remindersRoute.get("/:id", async (c) => {
  const repository = new ReminderRepository(c.env.DB);
  const reminder = await repository.findById(c.req.param("id"));
  if (!reminder) {
    return failure(c, 404, "Reminder not found");
  }

  return success(c, reminder);
});

remindersRoute.put("/:id", async (c) => {
  const body = await parseJson(c.req.raw);
  const parsed = updateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return failure(c, 422, "Validation failed", parsed.error.flatten());
  }

  const repository = new ReminderRepository(c.env.DB);
  const reminder = await repository.update(c.req.param("id"), parsed.data);
  if (!reminder) {
    return failure(c, 404, "Reminder not found");
  }

  return success(c, reminder);
});

remindersRoute.delete("/:id", async (c) => {
  const repository = new ReminderRepository(c.env.DB);
  const deleted = await repository.delete(c.req.param("id"));
  if (!deleted) {
    return failure(c, 404, "Reminder not found");
  }

  return success(c, { deleted: true });
});

remindersRoute.post("/:id/test", async (c) => {
  const repository = new ReminderRepository(c.env.DB);
  const reminder = await repository.findById(c.req.param("id"));
  if (!reminder) {
    return failure(c, 404, "Reminder not found");
  }

  const result = await EmailService.fromEnv(c.env).sendReminder(reminder);
  return success(c, result);
});

async function parseJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
