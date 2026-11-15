import { getEnv } from "lib/env";
import { getSetting } from "lib/settings";

export type ServerStatus =
  | { state: "unconfigured" }
  | { state: "unavailable" }
  | { state: "offline"; address: string }
  | { state: "online"; address: string; playersOnline: number; playersMax: number; version: string | null; motd: string | null };

let cache: { at: number; value: ServerStatus } | null = null;
const TTL_MS = 60_000;

/** Fetches status from a public status API with a short timeout and in-memory caching. Never throws. */
export async function getServerStatus(): Promise<ServerStatus> {
  const server = await getSetting("server");
  if (!server.statusEnabled || !server.javaAddress) return { state: "unconfigured" };
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value: ServerStatus;
  try {
    const base = process.env.MINECRAFT_STATUS_API ? getEnv().MINECRAFT_STATUS_API : "https://api.mcsrvstat.us/3";
    const res = await fetch(`${base.replace(/\/$/, "")}/${encodeURIComponent(server.javaAddress)}`, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "JPXMC-Webstore/1.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      online?: boolean;
      players?: { online?: number; max?: number };
      version?: string;
      motd?: { clean?: string[] };
    };
    value = json.online
      ? {
          state: "online",
          address: server.javaAddress,
          playersOnline: json.players?.online ?? 0,
          playersMax: json.players?.max ?? 0,
          version: json.version ?? null,
          motd: json.motd?.clean?.join(" ") ?? null,
        }
      : { state: "offline", address: server.javaAddress };
  } catch {
    value = { state: "unavailable" };
  }
  cache = { at: Date.now(), value };
  return value;
}
