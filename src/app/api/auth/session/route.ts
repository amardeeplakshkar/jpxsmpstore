import { ok, route } from "lib/api";
import { getCurrentUser } from "lib/auth/session";
import { discordAvatarUrl } from "lib/utils";

export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) return ok({ authenticated: false as const });
  return ok({
    authenticated: true as const,
    user: {
      discordId: user.discordId,
      username: user.username,
      globalName: user.globalName,
      avatarUrl: discordAvatarUrl(user.discordId, user.avatar),
      status: user.status,
      isAdmin: Boolean(user.adminRole),
      adminRole: user.adminRole,
    },
  });
});
