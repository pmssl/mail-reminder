import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class NoopEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("NoopEmailProvider skipped email", {
      to: message.to,
      subject: message.subject,
    });

    return {
      provider: "noop",
      messageId: crypto.randomUUID(),
    };
  }
}
