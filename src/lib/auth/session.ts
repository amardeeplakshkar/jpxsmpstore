import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "db/client";
import { adminUsers, sessions, users, type AdminRole, type User } from "db/schema";
import { hmac, randomToken } from "lib/crypto";

export const SESSION_COOKIE = "jpx_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
});

export async function createSession(userId: string, meta: { userAgent?: string | null; ip?: string | null }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: hmac(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    ip: meta.ip?.slice(0, 64) ?? null,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  // Opportunistic cleanup of expired sessions for this user.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hmac(token)));
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = User & { adminRole: AdminRole | null };

/** Returns the authenticated user for this request (memoised per request), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const id = hmac(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  // Sliding expiry: extend the DB session when less than half the TTL remains.
  if (row.session.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt, lastSeenAt: new Date() }).where(eq(sessions.id, id));
    try {
      jar.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
    } catch {
      // Cookies are read-only in Server Components; the cookie is refreshed on the next route handler call.
    }
  }

  const admin = await db.query.adminUsers.findFirst({
    where: and(eq(adminUsers.discordId, row.user.discordId), eq(adminUsers.isActive, true)),
  });
  return { ...row.user, adminRole: admin?.role ?? null };
});
