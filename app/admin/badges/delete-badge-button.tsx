"use client";

import { Trash2 } from "lucide-react";
import { deleteBadgeAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/submit-button";

type DeleteBadgeButtonProps = {
  assignedCount: number;
  badgeId: string;
  badgeName: string;
};

export function DeleteBadgeButton({ assignedCount, badgeId, badgeName }: DeleteBadgeButtonProps) {
  const disabled = assignedCount > 0;

  return (
    <form
      action={deleteBadgeAction}
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (!window.confirm(`Delete the "${badgeName}" badge? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="badgeId" type="hidden" value={badgeId} />
      <SubmitButton className="w-full" disabled={disabled} icon={<Trash2 className="size-4" />} pendingLabel="Deleting..." type="submit" variant="danger">
        Delete
      </SubmitButton>
    </form>
  );
}
