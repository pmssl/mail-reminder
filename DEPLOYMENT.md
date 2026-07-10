# Deployment Guide

This project deploys as:

- Cloudflare Worker API: Hono routes, D1 binding, and Cron Trigger.
- Cloudflare Pages frontend: static Vite build.
- Cloudflare D1 database: reminder storage.

## GitHub Actions Deployment

This repository includes `.github/workflows/deploy.yml`. It deploys automatically on pushes to `main` and can also be run manually from the GitHub Actions tab.

### Required GitHub Secrets

In GitHub, open `Settings -> Secrets and variables -> Actions -> Secrets` and add:

| Secret | Description |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers, Pages, D1 edit access. |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID. |
| `CLOUDMAIL_BASE_URL` | `https://mail.aimid.shop`. |
| `CLOUDMAIL_TOKEN` | Cloud Mail login JWT. |
| `VITE_API_TOKEN` | Optional. Only needed if Worker `API_TOKEN` is enabled. |

The Cloudflare API token should allow editing Workers, Pages, D1, and Worker secrets for this account.

### Required GitHub Variables

In `Settings -> Secrets and variables -> Actions -> Variables`, add:

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Worker API URL, for example `https://mail-reminder-api.<subdomain>.workers.dev`. Leave empty only when Pages and Worker share one domain under `/api/*`. |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | Optional. Defaults to `mail-reminder`. |

### One-Time Cloudflare Setup

Create D1 once:

```bash
npx wrangler d1 create mail_reminder
```

Copy the returned `database_id` into `wrangler.toml`, then commit and push.

The GitHub Action will apply D1 migrations, deploy the Worker, and deploy Pages on each push to `main`.

### API Token Note

If you set a Worker secret named `API_TOKEN`, the frontend must be built with matching `VITE_API_TOKEN`. Because frontend variables are visible in the browser bundle, this is only lightweight access control. For this personal app, deploying without `API_TOKEN` is usually simpler.

## 1. Create D1

```bash
wrangler d1 create mail_reminder
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mail_reminder"
database_id = "your-real-database-id"
migrations_dir = "migrations"
```

Apply the migration remotely:

```bash
npm run db:migrate:remote
```

## 2. Configure Worker Variables

Keep secrets out of `wrangler.toml`.

Recommended secret:

```bash
wrangler secret put API_TOKEN
```

For SMTP:

```bash
wrangler secret put SMTP_HOST
wrangler secret put SMTP_USERNAME
wrangler secret put SMTP_PASSWORD
wrangler secret put SMTP_FROM_EMAIL
wrangler secret put SMTP_FROM_NAME
```

Non-secret SMTP values can remain in `wrangler.toml`:

```toml
[vars]
EMAIL_PROVIDER = "smtp"
SMTP_PORT = "587"
SMTP_SECURE = "false"
APP_ORIGIN = "https://your-pages-domain.pages.dev"
```

For Cloud Mail:

```bash
wrangler secret put CLOUDMAIL_BASE_URL
wrangler secret put CLOUDMAIL_TOKEN
wrangler secret put CLOUDMAIL_ACCOUNT_ID
wrangler secret put CLOUDMAIL_FROM_NAME
```

Then set:

```toml
[vars]
EMAIL_PROVIDER = "cloudmail"
APP_ORIGIN = "https://your-pages-domain.pages.dev"
```

## 3. Deploy API Worker

```bash
npm run deploy:api
```

The cron trigger is defined in `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 * * *"]
```

That runs once per day at midnight UTC.

## 4. Deploy Frontend to Pages

Build:

```bash
npm run build
```

Deploy:

```bash
npm run deploy:frontend
```

In Cloudflare Pages settings, set:

```ini
VITE_API_BASE_URL=https://your-worker.your-subdomain.workers.dev
```

If your Worker requires `API_TOKEN`, also set:

```ini
VITE_API_TOKEN=your-api-token
```

If you route the Worker at the same custom domain under `/api/*`, leave `VITE_API_BASE_URL` empty so the frontend calls `/api/...` on the current origin.

## 5. Same-domain Routing Option

For a custom domain such as `reminders.example.com`, configure:

- Pages for `reminders.example.com`
- Worker route for `reminders.example.com/api/*`

The frontend includes `public/_redirects` so non-API browser routes fall back to `index.html`.

## 6. First Run Checklist

1. Confirm `GET /api/health` returns `code: 200`.
2. Create a reminder in the dashboard.
3. Use the test-send action.
4. Confirm the email provider response is successful.
5. Confirm D1 contains the reminder.
6. Confirm Cloudflare shows the Worker cron trigger.

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `API_TOKEN` | Recommended | Optional API token checked against `Authorization`. |
| `APP_ORIGIN` | Recommended | CORS origin for the frontend. |
| `EMAIL_PROVIDER` | Yes | `smtp`, `cloudmail`, or `noop`. |
| `SMTP_HOST` | SMTP | SMTP hostname. |
| `SMTP_PORT` | SMTP | Usually `587` or `465`. |
| `SMTP_SECURE` | SMTP | `true` for implicit TLS. |
| `SMTP_STARTTLS` | SMTP | Set `false` to disable STARTTLS on non-secure ports. |
| `SMTP_USERNAME` | SMTP | SMTP auth username. |
| `SMTP_PASSWORD` | SMTP | SMTP auth password. |
| `SMTP_FROM_EMAIL` | SMTP | Sender email address. |
| `SMTP_FROM_NAME` | SMTP | Sender display name. |
| `SMTP_EHLO_DOMAIN` | SMTP | Optional EHLO domain. |
| `CLOUDMAIL_BASE_URL` | Cloud Mail | Base URL of the Cloud Mail service. |
| `CLOUDMAIL_TOKEN` | Cloud Mail | Token returned by `/api/login`. |
| `CLOUDMAIL_ACCOUNT_ID` | Cloud Mail | Sending account ID. |
| `CLOUDMAIL_FROM_NAME` | Cloud Mail | Optional sender display name. |
| `VITE_API_BASE_URL` | Frontend | Worker API base URL for production builds. |
| `VITE_DEV_API_BASE_URL` | Frontend | Worker API base URL for Vite proxy in local dev. |

## Notes

- Dates are stored as UTC `YYYY-MM-DD` strings.
- The cron advances missed recurring reminders to the next future date after a successful send.
- Failed sends are logged and left due so the next cron run can retry.
- Once-only reminders are disabled after a successful send.
- SMTP uses Cloudflare Workers TCP sockets. Use an email provider that accepts connections from Workers.

## References

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare Workers TCP sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)
