import { createMiddleware } from "hono/factory";
import type { Env } from "@shared/types/env";
import { failure } from "../response";

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (c.req.method === "OPTIONS") {
    await next();
    return;
  }

  const expectedToken = c.env.API_TOKEN;
  if (!expectedToken) {
    await next();
    return;
  }

  const header = c.req.header("Authorization") ?? "";
  const providedToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;

  if (providedToken !== expectedToken) {
    return failure(c, 401, "Unauthorized");
  }

  await next();
});
