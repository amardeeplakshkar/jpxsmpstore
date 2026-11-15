import { redirect } from "next/navigation";
import { ApiError } from "lib/api";
import { getCurrentUser, type SessionUser } from "lib/auth/session";
import { hasPermission, type Permission } from "lib/permissions";

export type AdminSession = SessionUser & { adminRole: NonNullable<SessionUser["adminRole"]> };

/** API guard: any logged-in, non-blocked user. */
export async function requireUserApi(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please log in with Discord.");
  if (user.status === "BLOCKED") throw new ApiError(403, "ACCOUNT_BLOCKED", "Your account has been blocked.");
  return user;
}

/** API guard: admin with a specific permission. Every admin endpoint calls this. */
export async function requireAdminApi(permission: Permission): Promise<AdminSession> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please log in with Discord.");
  if (!user.adminRole || user.status === "BLOCKED") throw new ApiError(403, "FORBIDDEN", "Admin access required.");
  if (!hasPermission(user.adminRole, permission)) {
    throw new ApiError(403, "FORBIDDEN", "Your admin role does not allow this action.");
  }
  return user as AdminSession;
}

/** Page guard for the admin area. */
export async function requireAdminPage(permission: Permission = "dashboard.view"): Promise<AdminSession> {
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/discord?returnTo=${encodeURIComponent("/admin/dashboard")}`);
  if (!user.adminRole || user.status === "BLOCKED") redirect("/?error=not_admin");
  if (!hasPermission(user.adminRole, permission)) redirect("/admin/dashboard?error=forbidden");
  return user as AdminSession;
}

export async function requireUserPage(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/discord?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}
