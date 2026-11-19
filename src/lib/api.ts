import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { appUrl } from "lib/env";
import { invalidateStoreCache } from "lib/cache";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message, details } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** CSRF defence for cookie-authenticated writes: the Origin (or Referer) must match the app URL or the request host. */
export function assertSameOrigin(req: NextRequest | Request) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const source = origin ?? (referer ? new URL(referer).origin : null);
  if (!source) {
    throw new ApiError(403, "CSRF_FAILED", "Cross-site request blocked.");
  }

  // 1. Check against configured NEXT_PUBLIC_APP_URL
  try {
    const expected = new URL(appUrl()).origin;
    if (source === expected) return;
  } catch {}

  // 2. Check against the request's own host (handles Vercel domains, preview deployments, custom domains, localhost)
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    try {
      const sourceHost = new URL(source).host;
      if (sourceHost === host) return;
    } catch {}
  }

  throw new ApiError(403, "CSRF_FAILED", "Cross-site request blocked.");
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps a route handler with CSRF checks and consistent error responses. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      assertSameOrigin(req);
      const res = await handler(req, ctx);
      // Any successful admin write (products, categories, game modes, announcements, settings...)
      // clears the cached storefront data so the change is visible on the next request.
      const method = req.method.toUpperCase();
      if (method !== "GET" && method !== "HEAD" && res.ok && new URL(req.url).pathname.startsWith("/api/admin/")) {
        invalidateStoreCache();
      }
      return res;
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, err.code, err.message, err.details);
      if (err instanceof ZodError) {
        return fail(422, "VALIDATION_FAILED", "Some fields are invalid.", err.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
      }
      console.error("[api] unhandled error", err);
      return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}

/** Postgres unique-violation detection (code 23505), optionally for a specific constraint. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = (err as { cause?: unknown })?.cause ?? err;
  const pg = e as { code?: string; constraint?: string };
  return pg?.code === "23505" && (!constraint || pg.constraint === constraint);
}
