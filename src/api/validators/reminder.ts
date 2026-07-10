import { z } from "zod";
import { repeatTypes } from "@shared/types/reminder";
import { isDateString } from "@shared/utils/dates";
import { calculateInitialNextRun } from "@shared/utils/repeat";

const dateString = z.string().refine(isDateString, "Expected date format YYYY-MM-DD");

const createReminderObject = z
  .object({
    title: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(320),
    subject: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(10000),
    repeat_type: z.enum(repeatTypes),
    repeat_value: z.coerce.number().int().positive().max(10000).default(1),
    start_date: dateString,
    next_run: dateString.nullish(),
    enabled: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.next_run && value.next_run < value.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "next_run must be on or after start_date",
        path: ["next_run"],
      });
    }
  });

const updateReminderObject = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    email: z.string().trim().email().max(320).optional(),
    subject: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(10000).optional(),
    repeat_type: z.enum(repeatTypes).optional(),
    repeat_value: z.coerce.number().int().positive().max(10000).optional(),
    start_date: dateString.optional(),
    next_run: dateString.nullish(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required")
  .superRefine((value, ctx) => {
    if (value.next_run && value.start_date && value.next_run < value.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "next_run must be on or after start_date",
        path: ["next_run"],
      });
    }
  });

export const createReminderSchema = createReminderObject.transform((value) => ({
  ...value,
  repeat_value: value.repeat_type === "once" ? 1 : value.repeat_value,
  next_run: value.next_run ?? calculateInitialNextRun(value.start_date, value.repeat_type, value.repeat_value),
}));

export const updateReminderSchema = updateReminderObject.transform((value) => ({
  ...value,
  repeat_value: value.repeat_type === "once" ? 1 : value.repeat_value,
}));
