import "server-only";

import { auditLogs } from "@/db/schema";
import { getDb } from "@/lib/db";

type AuditInput = {
  action: string;
  actorId?: string | null;
  actorType?: "user" | "admin" | "system";
  entityId?: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  await getDb().insert(auditLogs).values({
    action: input.action,
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "user",
    entityId: input.entityId ?? null,
    entityType: input.entityType,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}
