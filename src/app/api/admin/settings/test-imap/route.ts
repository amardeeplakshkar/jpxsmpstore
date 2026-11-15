import { z } from "zod";
import { ApiError, ok, parseJson, route } from "lib/api";
import { requireAdminApi } from "lib/auth/guards";
import { decryptSecret } from "lib/crypto";
import { getSetting } from "lib/settings";
import { testImapConnection } from "../../../../../../worker/src/imap/poller";

const schema = z.object({
  host: z.string().min(1).max(200),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1).max(200),
  password: z.string().max(500).optional(),
  mailbox: z.string().min(1).max(120),
});

/** Tests IMAP credentials from the admin panel. Uses the stored password when none is supplied. */
export const POST = route(async (req) => {
  await requireAdminApi("settings.payment");
  const input = await parseJson(req, schema);
  const stored = await getSetting("imap");
  const password = input.password || (stored.passwordEncrypted ? decryptSecret(stored.passwordEncrypted) : "");
  if (!password) throw new ApiError(422, "NO_PASSWORD", "Enter the IMAP password to test.");
  try {
    const r = await testImapConnection({ ...input, password });
    return ok(r);
  } catch (err) {
    throw new ApiError(502, "IMAP_FAILED", `Connection failed: ${(err as Error).message}`.slice(0, 300));
  }
});
