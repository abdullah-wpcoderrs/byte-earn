import "server-only";

import { createClient } from "@/lib/supabase/server";

type AuditInput = {
  action: string;
  actorId?: string | null;
  actorType?: "user" | "admin" | "system";
  entityId?: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_logs").insert({
    action: input.action,
    actor_id: input.actorId ?? null,
    actor_type: input.actorType ?? "user",
    entity_id: input.entityId ?? null,
    entity_type: input.entityType,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
