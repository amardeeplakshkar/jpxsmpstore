import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl, createPkcePair } from "lib/discord/oauth";
import { randomToken, signPayload } from "lib/crypto";
import { clientIp, fail } from "lib/api";
import { rateLimit } from "lib/rate-limit";
import { safeReturnTo } from "lib/utils";

export const OAUTH_COOKIE = "jpx_oauth";

/** Starts Discord OAuth. Stores state + PKCE verifier + return path in a signed, HTTP-only, 10-minute cookie. */
export async function GET(req: NextRequest) {
  try {
    await rateLimit("oauth-start", clientIp(req), 30, 60);
  } catch {
    return fail(429, "RATE_LIMITED", "Too many login attempts. Please wait a minute.");
  }
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  const state = randomToken(24);
  const { verifier, challenge } = createPkcePair();
  const res = NextResponse.redirect(buildAuthorizeUrl(state, challenge));
  res.cookies.set(OAUTH_COOKIE, signPayload({ state, verifier, returnTo, at: Date.now() }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
