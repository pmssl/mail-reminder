import type { Reminder } from "@shared/types/reminder";
import type { Env } from "@shared/types/env";
import { plainTextToHtml } from "@shared/utils/html";
import { CloudMailEmailProvider } from "./cloudMailEmailProvider";
import { NoopEmailProvider } from "./noopEmailProvider";
import { SmtpEmailProvider } from "./smtpEmailProvider";
import type { EmailProvider, EmailSendResult } from "./types";

export class EmailService {
  constructor(private readonly provider: EmailProvider) {}

  static fromEnv(env: Env): EmailService {
    return new EmailService(createEmailProvider(env));
  }

  async sendReminder(reminder: Reminder): Promise<EmailSendResult> {
    return this.provider.send({
      to: reminder.email,
      subject: reminder.subject,
      text: reminder.content,
      html: renderReminderHtml(reminder),
    });
  }
}

function createEmailProvider(env: Env): EmailProvider {
  switch (env.EMAIL_PROVIDER ?? "smtp") {
    case "cloudmail":
      return new CloudMailEmailProvider(env);
    case "noop":
      return new NoopEmailProvider();
    case "smtp":
      return new SmtpEmailProvider(env);
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
  }
}

function renderReminderHtml(reminder: Reminder): string {
  return [
    '<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">',
    `<h1 style="font-size:20px;margin:0 0 16px">${plainTextToHtml(reminder.title)}</h1>`,
    `<div style="font-size:15px">${plainTextToHtml(reminder.content)}</div>`,
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">',
    '<p style="font-size:12px;color:#64748b;margin:0">Sent by Mail Reminder.</p>',
    "</div>",
  ].join("");
}
