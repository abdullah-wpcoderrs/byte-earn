import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const EMAIL_BLAST_BATCH_SIZE = 20;
export const EMAIL_BLAST_HTML_LIMIT = 50_000;
export const EMAIL_BLAST_EDITABLE_STATUSES = new Set(["draft", "failed"]);
export const EMAIL_BLAST_QUEUEABLE_STATUSES = new Set(["draft", "failed"]);

type BlastAudience = "active" | "all" | "suspended";

function isBlastAudience(value: string): value is BlastAudience {
  return value === "all" || value === "active" || value === "suspended";
}

function uniqueRecipients(emails: string[]) {
  return Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
}

export function extractEmailBlastText(html: string) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function hasMeaningfulEmailBlastContent(html: string) {
  return extractEmailBlastText(html).length > 0;
}

export function buildEmailBlastPreview(html: string) {
  return extractEmailBlastText(html).slice(0, 140);
}

export function parseRecipientSnapshot(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return uniqueRecipients(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return [];
  }
}

async function listAuthUsersWithEmail(supabase: ReturnType<typeof createAdminClient>) {
  const users: Array<{ email: string; id: string }> = [];

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw new Error(error.message);
    }

    const batch = data.users
      .filter((user) => Boolean(user.email))
      .map((user) => ({
        email: user.email!,
        id: user.id,
      }));
    users.push(...batch);

    if (data.users.length < 1000) {
      break;
    }
  }

  return users;
}

export async function resolveAudienceRecipients(
  supabase: ReturnType<typeof createAdminClient>,
  audience: string,
) {
  if (!isBlastAudience(audience)) {
    throw new Error("Invalid email blast audience");
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, status");

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const eligibleIds = new Set(
    (profiles ?? [])
      .filter((profile) => (audience === "all" ? profile.status !== "suspended" : profile.status === audience))
      .map((profile) => profile.id),
  );

  const authUsers = await listAuthUsersWithEmail(supabase);
  return uniqueRecipients(authUsers.filter((user) => eligibleIds.has(user.id)).map((user) => user.email));
}

export function buildEmailBlastFailureMessage(failedRecipientCount: number) {
  return failedRecipientCount === 1
    ? "1 recipient failed during delivery. Retry will resend only the failed recipient."
    : `${failedRecipientCount} recipients failed during delivery. Retry will resend only the failed recipients.`;
}
