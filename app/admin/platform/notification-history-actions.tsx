"use client";

import { Archive, Trash2 } from "lucide-react";
import { archiveNotificationAction, deleteNotificationAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/submit-button";

type NotificationHistoryActionsProps = {
  archived: boolean;
  notificationId: string;
};

export function NotificationHistoryActions({ archived, notificationId }: NotificationHistoryActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <form
        action={archiveNotificationAction}
        onSubmit={(event) => {
          if (archived) {
            event.preventDefault();
            return;
          }

          if (!window.confirm("Archive this notification and remove it from user trays?")) {
            event.preventDefault();
          }
        }}
      >
        <input name="notificationId" type="hidden" value={notificationId} />
        <SubmitButton className="w-full" disabled={archived} icon={<Archive className="size-4" />} pendingLabel="Archiving..." type="submit" variant="secondary">
          Archive
        </SubmitButton>
      </form>
      <form
        action={deleteNotificationAction}
        onSubmit={(event) => {
          if (!window.confirm("Delete this notification? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
      >
        <input name="notificationId" type="hidden" value={notificationId} />
        <SubmitButton className="w-full" icon={<Trash2 className="size-4" />} pendingLabel="Deleting..." type="submit" variant="danger">
          Delete
        </SubmitButton>
      </form>
    </div>
  );
}
