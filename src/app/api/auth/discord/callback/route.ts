import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForUser } from "lib/discord/oauth";
import { safeEqual, verifyPayload } from "lib/crypto";
import { createSession } from "lib/auth/session";
import { syncDiscordUser } from "lib/auth/sync";
import { audit } from "lib/audit";
import { clientIp } from "lib/api";
import { appUrl } from "lib/env";
import { safeReturnTo } from "lib/utils";

type OAuthCookie = { state: string; verifier: string; returnTo: string; at: number };

function back(path: string) {
  const res = NextResponse.redirect(new URL(path, appUrl()));
  res.cookies.set("jpx_oauth", "", { path: "/api/auth", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const saved = verifyPayload<OAuthCookie>(req.cookies.get("jpx_oauth")?.value);
  const state = params.get("state");
  const code = params.get("code");

  if (params.get("error")) {
    // e.g. access_denied, or prompt=none needs consent: retry with consent screen once.
    if (params.get("error") === "consent_required" && saved) return back(`/api/auth/discord?returnTo=${encodeURIComponent(saved.returnTo)}`);
    return back("/?auth_error=cancelled");
  }
  if (!saved || !state || !code || !safeEqual(saved.state, state) || Date.now() - saved.at > 600_000) {
    return back("/?auth_error=invalid_state");
  }

  try {
    const discordUser = await exchangeCodeForUser(code, saved.verifier);
    const user = await syncDiscordUser(discordUser);
    if (user.status === "BLOCKED") {
      await audit({ actor: { id: user.id, discordId: user.discordId }, actorType: "USER", action: "auth.login_blocked", entityType: "user", entityId: user.id, req });
      return back("/?auth_error=blocked");
    }
    await createSession(user.id, { userAgent: req.headers.get("user-agent"), ip: clientIp(req) });
    await audit({ actor: { id: user.id, discordId: user.discordId }, actorType: "USER", action: "auth.login", entityType: "user", entityId: user.id, req });
    return back(safeReturnTo(saved.returnTo));
  } catch (err) {
    console.error("[oauth] callback failed", (err as Error).message);
    return back("/?auth_error=failed");
  }
}
