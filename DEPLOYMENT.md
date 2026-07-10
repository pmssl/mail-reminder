# Deployment Guide

This project deploys as one Cloudflare Worker:

- React/Vite frontend is served by Workers Assets from `dist`.
- Hono API runs under `/api/*`.
- D1 stores reminders.
- Worker Cron Trigger sends due reminders once per day.

The same domain can open the dashboard and call the API:

```text
https://your-worker-domain/        -> frontend dashboard
https://your-worker-domain/api/*   -> Worker API
```

## GitHub Actions Deployment

The repository includes `.github/workflows/deploy.yml`. It runs on pushes to `main` and can also be triggered manually from the GitHub Actions tab.

### Required GitHub Secrets

In GitHub, open `Settings -> Secrets and variables -> Actions -> Secrets` and add:

| Secret | Description |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers Scripts edit, D1 edit, and Account Settings read access. |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID. |
| `CLOUDMAIL_BASE_URL` | `https://mail.aimid.shop`. |
| `CLOUDMAIL_TOKEN` | Cloud Mail login JWT. |
| `VITE_API_TOKEN` | Optional. Only needed if Worker `API_TOKEN` is enabled. |

The current deployment uses Cloud Mail account `46` from `wrangler.toml`, which sends as `mailreminder@aimid.shop`.

### Optional GitHub Secrets

If you enable API token protection on the Worker, add the same value in both places:

| Secret | Used by |
| --- | --- |
| `API_TOKEN` | Worker runtime secret. |
| `VITE_API_TOKEN` | Frontend build-time variable. |

The included workflow does not currently upload `API_TOKEN` automatically. For a personal dashboard on a private/custom domain, leaving `API_TOKEN` unset is the simplest setup.

### D1 Setup

The GitHub Action automatically creates the D1 database named `mail_reminder` when it does not exist. It then patches `wrangler.toml` inside the CI workspace with the resolved database ID before applying migrations and deploying the Worker.

Manual creation is still supported:

```bash
npx wrangler d1 create mail_reminder
```

If you create it manually, copy the returned `database_id` into `wrangler.toml`, then commit and push. If you leave the placeholder ID in `wrangler.toml`, the GitHub Action will replace it during deployment.

## Local Deployment

Install dependencies:

```bash
npm install
```

Build and deploy the Worker with frontend assets:

```bash
npm run deploy
```

Apply D1 migrations remotely when needed:

```bash
npm run db:migrate:remote
```

## Worker Assets

The Worker serves the Vite build through this `wrangler.toml` block:

```toml
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]
```

This means `/api/*` is handled by Hono, while all other paths are served from the frontend build. React routes fall back to `index.html`.

## Cron

The cron trigger is defined in `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 * * *"]
```

It runs once per day at midnight UTC, which is 08:00 in Beijing time.

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `API_TOKEN` | Optional | Optional API token checked against `Authorization`. |
| `APP_ORIGIN` | Optional | CORS origin. `*` is fine when frontend and API share one Worker domain. |
| `EMAIL_PROVIDER` | Yes | `smtp`, `cloudmail`, or `noop`. |
| `CLOUDMAIL_BASE_URL` | Cloud Mail | Base URL of the Cloud Mail service. |
| `CLOUDMAIL_TOKEN` | Cloud Mail | Token returned by `/api/login`. |
| `CLOUDMAIL_ACCOUNT_ID` | Cloud Mail | Sending account ID. |
| `CLOUDMAIL_FROM_NAME` | Cloud Mail | Optional sender display name. |
| `SMTP_HOST` | SMTP | SMTP hostname. |
| `SMTP_PORT` | SMTP | Usually `587` or `465`. |
| `SMTP_SECURE` | SMTP | `true` for implicit TLS. |
| `SMTP_STARTTLS` | SMTP | Set `false` to disable STARTTLS on non-secure ports. |
| `SMTP_USERNAME` | SMTP | SMTP auth username. |
| `SMTP_PASSWORD` | SMTP | SMTP auth password. |
| `SMTP_FROM_EMAIL` | SMTP | Sender email address. |
| `SMTP_FROM_NAME` | SMTP | Sender display name. |
| `SMTP_EHLO_DOMAIN` | SMTP | Optional EHLO domain. |
| `VITE_API_BASE_URL` | Optional | Leave empty for same-domain deployment. |
| `VITE_DEV_API_BASE_URL` | Local dev | Worker API base URL for the Vite dev proxy. |

## First Run Checklist

1. Open the Worker URL. The dashboard should load at `/`.
2. Confirm `GET /api/health` returns `code: 200`.
3. Create a reminder in the dashboard.
4. Use the test-send action.
5. Confirm Cloudflare shows the Worker cron trigger.

## Notes

- Dates are stored as UTC `YYYY-MM-DD` strings.
- The cron advances missed recurring reminders to the next future date after a successful send.
- Failed sends are logged and left due so the next cron run can retry.
- Once-only reminders are disabled after a successful send.
- SMTP uses Cloudflare Workers TCP sockets. Use an email provider that accepts connections from Workers.
