export type EmailProviderName = "smtp" | "cloudmail" | "noop";

export interface Env {
  DB: D1Database;
  API_TOKEN?: string;
  APP_ORIGIN?: string;
  EMAIL_PROVIDER?: EmailProviderName;

  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_STARTTLS?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM_EMAIL?: string;
  SMTP_FROM_NAME?: string;
  SMTP_EHLO_DOMAIN?: string;

  CLOUDMAIL_BASE_URL?: string;
  CLOUDMAIL_TOKEN?: string;
  CLOUDMAIL_ACCOUNT_ID?: string;
  CLOUDMAIL_FROM_NAME?: string;
}
