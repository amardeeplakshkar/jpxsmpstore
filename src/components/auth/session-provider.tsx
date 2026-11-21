"use client";

import * as React from "react";

export type ClientSessionUser = { name: string; avatar: string; isAdmin: boolean };
type SessionState = { ready: boolean; user: ClientSessionUser | null };

const Ctx = React.createContext<SessionState>({ ready: false, user: null });

/**
 * Loads the signed-in user in the browser instead of during server rendering.
 * Reading the session cookie on the server forced every store page to render per request
 * (plus a DB round trip); doing it here lets pages be served from the CDN cache.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SessionState>({ ready: false, user: null });
  React.useEffect(() => {
    let cancelled = false;
    // Logged-out visitors return instantly (no cookie means no DB query on the server).
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        const u = body?.ok && body.data?.authenticated ? body.data.user : null;
        setState({ ready: true, user: u ? { name: u.globalName ?? u.username, avatar: u.avatarUrl, isAdmin: Boolean(u.isAdmin) } : null });
      })
      .catch(() => !cancelled && setState({ ready: true, user: null }));
    return () => {
      cancelled = true;
    };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useSession() {
  return React.useContext(Ctx);
}
