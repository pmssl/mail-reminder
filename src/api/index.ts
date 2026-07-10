import { Hono } from "hono";
import { cors } from "hono/cors";
import { runReminderCron } from "@shared/cron/reminderCron";
import type { Env } from "@shared/types/env";
import { authMiddleware } from "./middleware/auth";
import { emailRoute } from "./routes/email";
import { remindersRoute } from "./routes/reminders";
import { failure, success } from "./response";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => c.env.APP_ORIGIN || origin || "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);

app.use("/api/*", authMiddleware);

app.get("/", (c) => c.redirect("/api/health"));
app.get("/api/health", (c) =>
  success(c, {
    ok: true,
    service: "mail-reminder-api",
  }),
);

app.route("/api/reminders", remindersRoute);
app.route("/api/email", emailRoute);

app.post("/api/cron/run", async (c) => {
  const result = await runReminderCron(c.env);
  return success(c, result);
});

app.notFound((c) => failure(c, 404, "Not found"));

app.onError((error, c) => {
  console.error("Unhandled API error", error);
  return failure(c, 500, "Internal server error");
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReminderCron(env, event.scheduledTime));
  },
};
