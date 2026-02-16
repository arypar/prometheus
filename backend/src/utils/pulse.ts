import { env } from "../config/env";

const API_URL = env.API_URL
  ? `${env.API_URL}/api/pulse`
  : `http://localhost:${env.PORT}/api/pulse`;

/**
 * Send a pulse event to the API for live frontend streaming.
 * Fire-and-forget — never throws or blocks the caller.
 */
export function pulse(
  category: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, message, meta }),
  }).catch(() => {});
}
