import { connect } from "cloudflare:sockets";
import type { Env } from "@shared/types/env";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

type WorkerSocket = ReturnType<typeof connect>;

interface SmtpResponse {
  code: number;
  message: string;
}

class SmtpConnection {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  private buffer = "";

  constructor(private socket: WorkerSocket) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  async open(): Promise<void> {
    await this.socket.opened;
    await this.readResponse([220]);
  }

  async startTls(): Promise<void> {
    this.reader.releaseLock();
    this.writer.releaseLock();
    this.socket = this.socket.startTls();
    this.reader = this.socket.readable.getReader();
    this.writer = this.socket.writable.getWriter();
    await this.socket.opened;
  }

  async command(command: string, expectedCodes: number[] = [250]): Promise<SmtpResponse> {
    await this.writer.write(this.encoder.encode(`${command}\r\n`));
    return this.readResponse(expectedCodes);
  }

  async data(content: string): Promise<SmtpResponse> {
    await this.command("DATA", [354]);
    await this.writer.write(this.encoder.encode(`${dotStuff(content)}\r\n.\r\n`));
    return this.readResponse([250]);
  }

  async close(): Promise<void> {
    try {
      await this.command("QUIT", [221]);
    } catch {
      // The connection is being closed anyway.
    }
    this.reader.releaseLock();
    this.writer.releaseLock();
    this.socket.close();
  }

  private async readResponse(expectedCodes: number[]): Promise<SmtpResponse> {
    const lines: string[] = [];

    while (true) {
      const line = await this.readLine();
      lines.push(line);

      const finalLine = /^(\d{3})\s/.exec(line);
      if (!finalLine) {
        continue;
      }

      const code = Number(finalLine[1]);
      const message = lines.join("\n");
      if (!expectedCodes.includes(code)) {
        throw new Error(`SMTP ${code}: ${message}`);
      }

      return { code, message };
    }
  }

  private async readLine(): Promise<string> {
    while (!this.buffer.includes("\n")) {
      const chunk = await this.reader.read();
      if (chunk.done) {
        throw new Error("SMTP connection closed unexpectedly");
      }
      this.buffer += this.decoder.decode(chunk.value, { stream: true });
    }

    const lineEnd = this.buffer.indexOf("\n");
    const line = this.buffer.slice(0, lineEnd).replace(/\r$/, "");
    this.buffer = this.buffer.slice(lineEnd + 1);
    return line;
  }
}

export class SmtpEmailProvider implements EmailProvider {
  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly startTlsEnabled: boolean;
  private readonly username?: string;
  private readonly password?: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly ehloDomain: string;

  constructor(env: Env) {
    if (!env.SMTP_HOST) {
      throw new Error("SMTP_HOST is required for the SMTP provider");
    }
    if (!env.SMTP_FROM_EMAIL && !env.SMTP_USERNAME) {
      throw new Error("SMTP_FROM_EMAIL or SMTP_USERNAME is required for the SMTP provider");
    }

    this.host = env.SMTP_HOST;
    this.port = Number(env.SMTP_PORT ?? 587);
    this.secure = env.SMTP_SECURE === "true" || this.port === 465;
    this.startTlsEnabled = env.SMTP_STARTTLS !== "false" && !this.secure;
    this.username = env.SMTP_USERNAME;
    this.password = env.SMTP_PASSWORD;
    this.fromEmail = env.SMTP_FROM_EMAIL ?? env.SMTP_USERNAME ?? "";
    this.fromName = env.SMTP_FROM_NAME ?? "Mail Reminder";
    this.ehloDomain = env.SMTP_EHLO_DOMAIN ?? this.fromEmail.split("@")[1] ?? "mail-reminder.local";

    if (!Number.isFinite(this.port)) {
      throw new Error("SMTP_PORT must be a number");
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const socket = connect(
      { hostname: this.host, port: this.port },
      { secureTransport: this.secure ? "on" : "off", allowHalfOpen: false },
    );
    const connection = new SmtpConnection(socket);
    const messageId = `<${crypto.randomUUID()}@${this.ehloDomain}>`;

    try {
      await connection.open();
      await connection.command(`EHLO ${this.ehloDomain}`);

      if (this.startTlsEnabled) {
        await connection.command("STARTTLS", [220]);
        await connection.startTls();
        await connection.command(`EHLO ${this.ehloDomain}`);
      }

      if (this.username && this.password) {
        await connection.command(`AUTH PLAIN ${base64Encode(`\0${this.username}\0${this.password}`)}`, [235]);
      }

      await connection.command(`MAIL FROM:<${this.fromEmail}>`);
      await connection.command(`RCPT TO:<${message.to}>`, [250, 251]);
      await connection.data(this.buildMimeMessage(message, messageId));

      return {
        provider: "smtp",
        messageId,
      };
    } finally {
      await connection.close();
    }
  }

  private buildMimeMessage(message: EmailMessage, messageId: string): string {
    const boundary = `mail-reminder-${crypto.randomUUID()}`;

    return [
      `From: ${formatMailbox(this.fromName, this.fromEmail)}`,
      `To: ${formatMailbox("", message.to)}`,
      `Subject: ${encodeHeader(message.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(base64Encode(message.text)),
      "",
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(base64Encode(message.html)),
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }
}

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function encodeHeader(value: string): string {
  const sanitized = value.replace(/[\r\n]+/g, " ").trim();
  if (/^[\x20-\x7E]*$/.test(sanitized)) {
    return sanitized;
  }
  return `=?UTF-8?B?${base64Encode(sanitized)}?=`;
}

function formatMailbox(name: string, email: string): string {
  return name ? `${encodeHeader(name)} <${email}>` : `<${email}>`;
}

function dotStuff(content: string): string {
  return content.replace(/^\./gm, "..");
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}
