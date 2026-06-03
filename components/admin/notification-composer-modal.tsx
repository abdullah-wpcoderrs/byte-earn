"use client";

import { useState } from "react";
import { BellPlus } from "lucide-react";
import { createNotificationAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextArea } from "@/components/ui/textarea";
import type { AdminNotificationRecipientOption } from "@/lib/admin";

type NotificationComposerModalProps = {
  recipients: AdminNotificationRecipientOption[];
};

export function NotificationComposerModal({ recipients }: NotificationComposerModalProps) {
  const [open, setOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"audience" | "targeted">("audience");

  return (
    <>
      <Button className="w-full self-start" icon={<BellPlus className="size-4" />} onClick={() => setOpen(true)} type="button">
        Create notification
      </Button>

      <Modal className="max-w-xl" onClose={() => setOpen(false)} open={open} title="Create platform notification">
        <form action={createNotificationAction} className="grid gap-3 pb-2">
          <Select defaultValue="audience" label="Delivery" name="deliveryMode" onChange={(event) => setDeliveryMode(event.target.value as "audience" | "targeted")}>
            <option value="audience">Audience group</option>
            <option value="targeted">Single user</option>
          </Select>
          <TextInput label="Title" maxLength={80} name="title" required />
          <TextArea label="Body" maxLength={600} name="body" required />
          {deliveryMode === "audience" ? (
            <Select defaultValue="all" label="Audience" name="audience">
              <option value="all">All users</option>
              <option value="active">Active users</option>
              <option value="suspended">Suspended users</option>
            </Select>
          ) : (
            <Select label="Recipient" name="recipientProfileId" required>
              <option value="">Choose user</option>
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.meta ? `${recipient.label} (${recipient.meta})` : recipient.label}
                </option>
              ))}
            </Select>
          )}
          <SubmitButton icon={<BellPlus className="size-4" />} pendingLabel="Creating..." type="submit">
            Create notification
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
