"use client";

import type { ApiResponse } from "lib/api";

export class ClientApiError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

/** Fetch wrapper for our JSON API. Throws ClientApiError with the server's message on failure. */
export async function api<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ClientApiError("BAD_RESPONSE", `Unexpected response (${res.status})`);
  }
  if (!body.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = `/api/auth/discord?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    const details = body.error.details as { path: string; message: string }[] | undefined;
    const first = Array.isArray(details) && details[0] ? `${details[0].path ? details[0].path + ": " : ""}${details[0].message}` : null;
    throw new ClientApiError(body.error.code, first ?? body.error.message, body.error.details);
  }
  return body.data;
}
