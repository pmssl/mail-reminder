export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSendResult {
  provider: string;
  messageId?: string;
  emailId?: number;
  accountId?: number;
  sendEmail?: string;
  status?: number;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
