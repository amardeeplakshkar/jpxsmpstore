import { createHash } from "node:crypto";
import { z } from "zod";
import { getEnv } from "lib/env";
import { randomToken } from "lib/crypto";

const DISCORD_API = "https://discord.com/api/v10";

export function createPkcePair() {
  const verifier = randomToken(48);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const env = getEnv();
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state,
    prompt: "none",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

const tokenSchema = z.object({ access_token: z.string(), token_type: z.string() });
const discordUserSchema = z.object({
  id: z.string().regex(/^\d{5,25}$/),
  username: z.string(),
  global_name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});
export type DiscordUser = z.infer<typeof discordUserSchema>;

/** Exchanges the authorization code and fetches the user. The access token is used once and never stored. */
export async function exchangeCodeForUser(code: string, codeVerifier: string): Promise<DiscordUser> {
  const env = getEnv();
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed (${res.status})`);
  const token = tokenSchema.parse(await res.json());
  const me = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `${token.token_type} ${token.access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!me.ok) throw new Error(`Discord user fetch failed (${me.status})`);
  return discordUserSchema.parse(await me.json());
}
