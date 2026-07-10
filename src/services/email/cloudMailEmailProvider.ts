import type { Env } from "@shared/types/env";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

interface CloudMailResponse {
  code?: number;
  message?: string;
  data?: Array<{
    accountId?: number;
    emailId?: number;
    messageId?: string;
    resendEmailId?: string;
    sendEmail?: string;
    status?: number;
  }>;
}

function buildCloudMailEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? `${trimmed}/email/send` : `${trimmed}/api/email/send`;
}

export class CloudMailEmailProvider implements EmailProvider {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly accountId: number;
  private readonly fromName?: string;

  constructor(env: Env) {
    if (!env.CLOUDMAIL_BASE_URL) {
      throw new Error("CLOUDMAIL_BASE_URL is required for the Cloud Mail provider");
    }
    if (!env.CLOUDMAIL_TOKEN) {
      throw new Error("CLOUDMAIL_TOKEN is required for the Cloud Mail provider");
    }
    if (!env.CLOUDMAIL_ACCOUNT_ID) {
      throw new Error("CLOUDMAIL_ACCOUNT_ID is required for the Cloud Mail provider");
    }

    this.endpoint = buildCloudMailEndpoint(env.CLOUDMAIL_BASE_URL);
    this.token = env.CLOUDMAIL_TOKEN;
    this.accountId = Number(env.CLOUDMAIL_ACCOUNT_ID);
    this.fromName = env.CLOUDMAIL_FROM_NAME;

    if (!Number.isFinite(this.accountId)) {
      throw new Error("CLOUDMAIL_ACCOUNT_ID must be a number");
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.token,
        "accept-language": "zh-CN",
      },
      body: JSON.stringify({
        accountId: this.accountId,
        name: this.fromName,
        receiveEmail: [message.to],
        subject: message.subject,
        content: message.html,
        text: message.text,
        sendType: "",
        emailId: 0,
        attachments: [],
      }),
    });

    const payload = (await response.json().catch(() => null)) as CloudMailResponse | null;
    if (!response.ok || payload?.code !== 200) {
      throw new Error(payload?.message || `Cloud Mail send failed with HTTP ${response.status}`);
    }

    const firstRecord = payload.data?.[0];
    return {
      provider: "cloudmail",
      messageId:
        firstRecord?.resendEmailId || firstRecord?.messageId || firstRecord?.emailId?.toString(),
      emailId: firstRecord?.emailId,
      accountId: firstRecord?.accountId,
      sendEmail: firstRecord?.sendEmail,
      status: firstRecord?.status,
    };
  }
}
