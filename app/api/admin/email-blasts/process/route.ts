import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { EMAIL_BLAST_BATCH_SIZE, buildEmailBlastFailureMessage, parseRecipientSnapshot } from "@/lib/email-blasts";
import { getGmailSmtpReadiness, sendGmailMessage } from "@/lib/email/gmail-smtp";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdminForRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin" || profile.status === "suspended") {
    return null;
  }

  return profile.id;
}

export async function POST(request: Request) {
  const adminId = await requireAdminForRoute();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminKey()) {
    return NextResponse.json({ error: "Missing service role key" }, { status: 503 });
  }

  const smtp = getGmailSmtpReadiness();
  if (!smtp.ready) {
    return NextResponse.json({ error: smtp.guidance }, { status: 503 });
  }

  const { blastId } = (await request.json()) as { blastId?: string };
  if (!blastId) {
    return NextResponse.json({ error: "Missing blastId" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: blast, error } = await supabase
    .from("email_blasts")
    .select("id, subject, html_body, status, recipient_snapshot, failed_recipient_snapshot, send_cursor, recipient_count, failed_recipient_count, processing_started_at")
    .eq("id", blastId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!blast) {
    return NextResponse.json({ error: "Blast not found" }, { status: 404 });
  }

  if (!["queued", "sending"].includes(blast.status)) {
    return NextResponse.json({ done: true, status: blast.status }, { status: 409 });
  }

  const recipients = parseRecipientSnapshot(blast.recipient_snapshot);
  const failedRecipients = parseRecipientSnapshot(blast.failed_recipient_snapshot);
  const nowIso = new Date().toISOString();

  if (blast.send_cursor >= recipients.length) {
    const terminalStatus = failedRecipients.length > 0 ? "failed" : "sent";
    const finalUpdate = {
      error_message: failedRecipients.length > 0 ? buildEmailBlastFailureMessage(failedRecipients.length) : null,
      failed_at: failedRecipients.length > 0 ? nowIso : null,
      last_processed_at: nowIso,
      sent_at: failedRecipients.length === 0 ? nowIso : null,
      status: terminalStatus,
    };
    const { error: finalError } = await supabase.from("email_blasts").update(finalUpdate).eq("id", blastId);
    if (finalError) {
      return NextResponse.json({ error: finalError.message }, { status: 500 });
    }

    await writeAuditLog({
      action: terminalStatus === "sent" ? "admin.email_blast.sent" : "admin.email_blast.failed",
      actorId: adminId,
      actorType: "admin",
      entityId: blastId,
      entityType: "email_blast",
      metadata: {
        failedRecipientCount: failedRecipients.length,
        recipientCount: blast.recipient_count,
      },
    });

    return NextResponse.json({
      done: true,
      failedRecipientCount: failedRecipients.length,
      processedRecipientCount: blast.send_cursor,
      queuedRecipientCount: recipients.length,
      recipientCount: blast.recipient_count,
      status: terminalStatus,
    });
  }

  const batch = recipients.slice(blast.send_cursor, blast.send_cursor + EMAIL_BLAST_BATCH_SIZE);
  const nextFailedRecipients = [...failedRecipients];
  let deliveredCount = blast.recipient_count;

  const { error: markSendingError } = await supabase
    .from("email_blasts")
    .update({
      last_processed_at: nowIso,
      processing_started_at: blast.processing_started_at ?? nowIso,
      status: "sending",
    })
    .eq("id", blastId);

  if (markSendingError) {
    return NextResponse.json({ error: markSendingError.message }, { status: 500 });
  }

  for (const email of batch) {
    try {
      await sendGmailMessage({ html: blast.html_body, subject: blast.subject, to: email });
      deliveredCount += 1;
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Email delivery failed.";
      if (!nextFailedRecipients.includes(email)) {
        nextFailedRecipients.push(email);
      }

      const { error: updateError } = await supabase
        .from("email_blasts")
        .update({
          error_message: message,
        })
        .eq("id", blastId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
  }

  const nextCursor = blast.send_cursor + batch.length;
  const isComplete = nextCursor >= recipients.length;
  const nextStatus = isComplete ? (nextFailedRecipients.length > 0 ? "failed" : "sent") : "sending";
  const updatePayload = {
    error_message: nextFailedRecipients.length > 0 ? buildEmailBlastFailureMessage(nextFailedRecipients.length) : null,
    failed_at: isComplete && nextFailedRecipients.length > 0 ? nowIso : null,
    failed_recipient_count: nextFailedRecipients.length,
    failed_recipient_snapshot: JSON.stringify(nextFailedRecipients),
    last_processed_at: nowIso,
    recipient_count: deliveredCount,
    send_cursor: nextCursor,
    sent_at: isComplete && nextFailedRecipients.length === 0 ? nowIso : null,
    status: nextStatus,
  };

  const { error: updateError } = await supabase.from("email_blasts").update(updatePayload).eq("id", blastId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (isComplete) {
    await writeAuditLog({
      action: nextFailedRecipients.length > 0 ? "admin.email_blast.failed" : "admin.email_blast.sent",
      actorId: adminId,
      actorType: "admin",
      entityId: blastId,
      entityType: "email_blast",
      metadata: {
        failedRecipientCount: nextFailedRecipients.length,
        recipientCount: deliveredCount,
      },
    });
  }

  return NextResponse.json({
    done: isComplete,
    failedRecipientCount: nextFailedRecipients.length,
    processedRecipientCount: nextCursor,
    queuedRecipientCount: recipients.length,
    recipientCount: deliveredCount,
    status: nextStatus,
  });
}
