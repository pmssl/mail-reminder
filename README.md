# Mail Reminder

A lightweight self-hosted email reminder app for Cloudflare Pages, Workers, D1, and Cron Triggers.

The app is designed for personal reminders such as checking a VPS every 90 days, renewing a domain every 3 months, or renewing a passport yearly. It is intentionally small: a React dashboard, a Hono API, a D1 database, and a daily Worker cron job.

## Features

- Reminder dashboard with title, email, next run, repeat interval, status, and actions.
- Create, edit, delete, enable, disable, and test-send reminders.
- Repeat rules: once, every X days, weekly, monthly, yearly.
- Extensible repeat-rule registry in `src/utils/repeat.ts`.
- Pluggable email service with SMTP, Cloud Mail API, and local no-op providers.
- D1 repository layer, service layer, validation, API error envelopes, and optional API token auth.
- Search, status filter, pagination, responsive UI, and dark mode.

## Project Structure

```text
src/
  api/              Hono routes, middleware, validation, API entry
  cron/             Daily reminder job
  repositories/     D1 data access
  services/         Email provider abstraction and implementations
  types/            Shared TypeScript types
  utils/            Date, repeat, and HTML helpers
frontend/
  src/              React + Vite + Tailwind dashboard
migrations/         D1 schema migrations
public/             Cloudflare Pages SPA fallback
```

## Local Development

Install dependencies:

```bash
npm install
```

Apply the local D1 migration:

```bash
npm run db:migrate:local
```

For local UI testing without sending real email, create `.dev.vars`:

```ini
EMAIL_PROVIDER=noop
APP_ORIGIN=http://localhost:5173
```

Start both the Worker API and frontend:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Scripts

- `npm run dev`: run Worker API and Vite frontend together.
- `npm run dev:api`: run the Worker API on `http://127.0.0.1:8787`.
- `npm run dev:frontend`: run the frontend on `http://localhost:5173`.
- `npm run db:migrate:local`: apply D1 migrations locally.
- `npm run db:migrate:remote`: apply D1 migrations to Cloudflare.
- `npm run test`: run unit tests.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: build the frontend and typecheck the project.
- `npm run deploy:api`: deploy the Worker API.
- `npm run deploy:frontend`: deploy `dist` to Cloudflare Pages.

## API

All routes return JSON envelopes:

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

Routes:

- `GET /api/health`
- `GET /api/reminders`
- `GET /api/reminders/:id`
- `POST /api/reminders`
- `PUT /api/reminders/:id`
- `DELETE /api/reminders/:id`
- `POST /api/reminders/:id/test`
- `POST /api/email/test`
- `POST /api/cron/run`

If `API_TOKEN` is configured, send it as the `Authorization` header. A `Bearer` prefix is also accepted.

The frontend reads `VITE_API_BASE_URL` and optional `VITE_API_TOKEN` at build time. In local development, leave `VITE_API_BASE_URL` empty and Vite proxies `/api` to the Worker.

## Email Providers

Set `EMAIL_PROVIDER` to one of:

- `smtp`
- `cloudmail`
- `noop`

### SMTP

Required:

```ini
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=sender@example.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=sender@example.com
SMTP_FROM_NAME=Mail Reminder
```

Use `SMTP_SECURE=true` for implicit TLS, usually port `465`. Port `587` uses STARTTLS by default unless `SMTP_STARTTLS=false`.

### Cloud Mail API

Required:

```ini
EMAIL_PROVIDER=cloudmail
CLOUDMAIL_BASE_URL=https://mail.example.com
CLOUDMAIL_TOKEN=jwt-token-from-login
CLOUDMAIL_ACCOUNT_ID=46
CLOUDMAIL_FROM_NAME=Mail Reminder
```

The provider calls `POST {CLOUDMAIL_BASE_URL}/api/email/send` with:

- `Authorization: <token>`
- `accountId: CLOUDMAIL_ACCOUNT_ID`
- `receiveEmail: [reminder.email]`
- `subject`, `content`, and `text` from the reminder.

### No-op

Use only for local development:

```ini
EMAIL_PROVIDER=noop
```

## Repeat Rules

Repeat behavior lives in `src/utils/repeat.ts`. Add a new rule by:

1. Adding the new repeat type to `src/types/reminder.ts`.
2. Adding a rule entry to `repeatRules`.
3. Updating validation and frontend select options.
4. Adding unit tests in `src/utils/repeat.test.ts`.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).
