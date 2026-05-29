import { requireAdmin } from "@/lib/admin";
import { createSponsoredTask } from "../actions";
import { TextInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AdminTaskCreatePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Create Sponsored Task</h1>

      <form action={createSponsoredTask} className="grid gap-6">
        <Select name="provider" label="Provider" required defaultValue="internal">
          <option value="internal">Internal</option>
          <option value="monetag">Monetag</option>
          <option value="cpagrip">CPAGrip</option>
        </Select>

        <TextInput
          name="title"
          label="Title"
          required
          placeholder="e.g. Watch Video & Earn"
        />

        <TextInput
          name="description"
          label="Description (optional)"
          placeholder="Detailed explanation of the task..."
        />

        <TextInput
          name="task_url"
          label="Task URL (Monetag / CPAGrip)"
          placeholder="https://..."
          type="url"
        />

        <TextInput
          name="media_url"
          label="Media URL (Internal Video/Image)"
          placeholder="https://..."
          type="url"
        />

        <TextInput
          name="reward_credits"
          label="Reward Credits"
          required
          type="number"
          min={0}
          placeholder="100"
        />

        <TextInput
          name="limit_per_user"
          label="Limit Per User (optional)"
          type="number"
          min={1}
          placeholder="e.g. 1 (leave blank for unlimited)"
        />

        <div className="flex justify-end pt-4">
          <SubmitButton>Create Task</SubmitButton>
        </div>
      </form>
    </div>
  );
}
