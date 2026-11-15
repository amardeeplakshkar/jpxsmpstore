import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "lib/api";
import { destroySession } from "lib/auth/session";
import { appUrl } from "lib/env";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
  } catch {
    return NextResponse.json({ ok: false, error: { code: "CSRF_FAILED", message: "Cross-site request blocked." } }, { status: 403 });
  }
  await destroySession();
  return NextResponse.redirect(new URL("/", appUrl()), { status: 303 });
}
