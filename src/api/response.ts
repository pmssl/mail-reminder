import type { Context } from "hono";

export function success(c: Context, data: unknown, status: 200 | 201 = 200, meta?: unknown): Response {
  return c.json(
    {
      code: status,
      message: "success",
      data,
      ...(meta ? { meta } : {}),
    },
    status,
  );
}

export function failure(c: Context, status: number, message: string, details?: unknown): Response {
  return c.json(
    {
      code: status,
      message,
      ...(details ? { details } : {}),
    },
    status as never,
  );
}
