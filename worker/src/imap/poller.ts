import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import { decryptSecret } from "lib/crypto";
import { getRedis } from "lib/redis";
import { getSetting } from "lib/settings";
import { processPaymentEmail } from "../matching/process";
import type { NormalizedEmail } from "../types";

type PollState = { uidValidity: string; lastUid: number };

function firstAddress(a: AddressObject | AddressObject[] | undefined): string {
  const obj = Array.isArray(a) ? a[0] : a;
  return (obj?.value?.[0]?.address ?? "").toLowerCase();
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|td|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8377;|&#x20b9;/gi, "₹");
}

export async function normalize(source: Buffer, mailbox: string, uid: number | null, internalDate?: Date): Promise<NormalizedEmail> {
  const mail = await simpleParser(source);
  const auth = mail.headers.get("authentication-results");
  return {
    messageId: (mail.messageId ?? `uid-${mailbox}-${uid}-${mail.date?.getTime() ?? Date.now()}`).slice(0, 500),
    mailbox,
    imapUid: uid,
    from: firstAddress(mail.from),
    subject: mail.subject ?? "",
    text: mail.text?.trim() ? mail.text : htmlToText(typeof mail.html === "string" ? mail.html : ""),
    receivedAt: internalDate ?? mail.date ?? new Date(),
    authResults: typeof auth === "string" ? auth : auth ? JSON.stringify(auth) : null,
  };
}

/** Connects, fetches messages newer than the last processed UID and processes each one. */
export async function pollMailbox(log: (msg: string) => void): Promise<{ processed: number; skipped: number }> {
  const cfg = await getSetting("imap");
  if (!cfg.enabled || !cfg.host || !cfg.username || !cfg.passwordEncrypted) {
    log("IMAP not configured or disabled; skipping poll");
    return { processed: 0, skipped: 0 };
  }
  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.username, pass: decryptSecret(cfg.passwordEncrypted) },
    logger: false,
    socketTimeout: 60_000,
  });
  const redis = getRedis();
  const stateKey = `imap:state:${cfg.host}:${cfg.username}:${cfg.mailbox}`;
  let processed = 0;
  let skipped = 0;
  await client.connect();
  const lock = await client.getMailboxLock(cfg.mailbox);
  try {
    const mb = client.mailbox;
    const uidValidity = mb && typeof mb !== "boolean" ? String(mb.uidValidity) : "0";
    const raw = await redis.get(stateKey);
    let state: PollState | null = raw ? (JSON.parse(raw) as PollState) : null;
    if (state && state.uidValidity !== uidValidity) state = null;

    let uids: number[];
    if (state) {
      const found = await client.search({ uid: `${state.lastUid + 1}:*` }, { uid: true });
      uids = (found || []).filter((u) => u > state!.lastUid);
    } else {
      // First run (or UIDVALIDITY changed): look back 2 days only. Message-ID dedup prevents double processing.
      const found = await client.search({ since: new Date(Date.now() - 2 * 24 * 3600 * 1000) }, { uid: true });
      uids = found || [];
    }
    uids.sort((a, b) => a - b);
    let lastUid = state?.lastUid ?? 0;
    for (const uid of uids.slice(0, 200)) {
      const msg = await client.fetchOne(String(uid), { source: true, internalDate: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const internal = msg.internalDate ? new Date(msg.internalDate) : undefined;
      const email = await normalize(msg.source, cfg.mailbox, uid, internal);
      const result = await processPaymentEmail(email);
      if (result.outcome === "skipped") skipped++;
      else processed++;
      log(`uid=${uid} from=${email.from} -> ${result.status ?? result.outcome}${result.reason ? ` (${result.reason})` : ""}`);
      lastUid = Math.max(lastUid, uid);
      await redis.set(stateKey, JSON.stringify({ uidValidity, lastUid } satisfies PollState));
    }
    if (!state && uids.length === 0) await redis.set(stateKey, JSON.stringify({ uidValidity, lastUid: 0 }));
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  return { processed, skipped };
}

/** Used by the admin "Test connection" button. Never returns credentials. */
export async function testImapConnection(cfg: { host: string; port: number; secure: boolean; username: string; password: string; mailbox: string }) {
  const client = new ImapFlow({ host: cfg.host, port: cfg.port, secure: cfg.secure, auth: { user: cfg.username, pass: cfg.password }, logger: false, socketTimeout: 20_000 });
  await client.connect();
  try {
    const status = await client.status(cfg.mailbox, { messages: true, unseen: true });
    return { messages: status.messages ?? 0, unseen: status.unseen ?? 0 };
  } finally {
    await client.logout().catch(() => undefined);
  }
}
