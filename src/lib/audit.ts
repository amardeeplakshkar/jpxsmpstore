import { db, type DbOrTx } from "db/client";
import { auditLogs } from "db/schema";

type AuditInput = {
  actor?: { id: string; discordId: string } | null;
  actorType?: "SYSTEM" | "USER" | "ADMIN" | "WORKER";
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  req?: Request;
};

/** Writes an append-only audit log row. Never include secrets in metadata. */
export async function audit(input: AuditInput, tx: DbOrTx = db) {
  await tx.insert(auditLogs).values({
    actorUserId: input.actor?.id ?? null,
    actorDiscordId: input.actor?.discordId ?? null,
    actorType: input.actorType ?? (input.actor ? "ADMIN" : "SYSTEM"),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip: input.req ? (input.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) : null,
    userAgent: input.req?.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
}
