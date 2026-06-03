"use client";

import { useState } from "react";
import { Pencil, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { createSponsoredTask, updateSponsoredTask } from "@/app/admin/tasks/actions";

type EditableProvider = "internal" | "adsterra" | "cpagrip";

type TaskFormModalProps = {
  task?: {
    id: string;
    title: string;
    provider: "internal" | "monetag" | "adsterra" | "cpagrip";
    description?: string | null;
    task_url?: string | null;
    media_url?: string | null;
    provider_placement_id?: string | null;
    provider_domain_id?: string | null;
    provider_tracking_param?: string | null;
    task_type?: string | null;
    reward_credits: number;
    limit_per_user: number;
    global_cap?: number | null;
  };
};

export function CreateTaskModal({ task }: TaskFormModalProps) {
  const [open, setOpen] = useState(false);
  const initialProvider = task?.provider === "monetag" ? "adsterra" : (task?.provider ?? "internal");
  const [provider, setProvider] = useState<EditableProvider>(initialProvider);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(task?.media_url ?? null);

  const handleOpen = () => {
    setOpen(true);
    setPreviewUrl(task?.media_url ?? null);
    setSelectedFile(null);
    if (task) {
      setProvider(task.provider === "monetag" ? "adsterra" : task.provider);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (!task) {
      setProvider("internal");
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const isVideoUrl = (url: string | null | undefined) => {
    if (!url) return false;
    const extension = url.split("?")[0].split(".").pop()?.toLowerCase();
    return ["mp4", "webm", "ogg", "mov", "quicktime"].includes(extension || "");
  };

  const isVideo = selectedFile
    ? selectedFile.type.startsWith("video/")
    : isVideoUrl(previewUrl);

  const isEdit = Boolean(task);

  return (
    <>
      {isEdit ? (
        <button
          onClick={handleOpen}
          type="button"
          className="grid size-7 cursor-pointer place-items-center rounded-[5px] border border-white/10 bg-white/[0.055] text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="Edit Task"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <Button onClick={handleOpen} type="button">
          Create Task
        </Button>
      )}

      <Modal open={open} onClose={handleClose} title={isEdit ? "Edit Sponsored Task" : "Create Sponsored Task"} className="max-w-lg">
        <form
          action={async (formData) => {
            try {
              if (isEdit) {
                await updateSponsoredTask(formData);
              } else {
                await createSponsoredTask(formData);
              }
              handleClose();
            } catch (err) {
              console.error("Failed to save sponsored task:", err);
            }
          }}
          encType="multipart/form-data"
          className="grid gap-5 py-2 text-left"
        >
          {isEdit && <input type="hidden" name="taskId" value={task?.id} />}

          <Select
            name="provider"
            label="Provider Network"
            required
            value={provider}
            onChange={(e) => setProvider(e.target.value as EditableProvider)}
          >
            <option value="internal">Internal Platform Sponsored Ad</option>
            <option value="adsterra">Adsterra SmartLink Task</option>
            <option value="cpagrip">CPAGrip Offer Task</option>
          </Select>

          <TextInput
            name="title"
            label="Campaign Title"
            required
            defaultValue={task?.title}
            placeholder={
              provider === "adsterra"
                ? "e.g. Adsterra SmartLink reward"
                : provider === "cpagrip"
                ? "e.g. Complete survey to unlock rewards"
                : "e.g. Share Branded Post to Twitter"
            }
          />

          {/* Conditional Description for CPAGrip and Internal Tasks */}
          {provider !== "adsterra" && (
            <TextInput
              name="description"
              label={provider === "internal" ? "Shareable Caption (required)" : "Description / Instructions (required)"}
              required
              defaultValue={task?.description ?? ""}
              placeholder={
                provider === "internal"
                  ? "Enter the exact text/caption that users will copy & share on their social feed..."
                  : "Step-by-step guidelines for users to complete this offer..."
              }
            />
          )}

          {/* Conditional Task URL for Adsterra and CPAGrip Tasks */}
          {provider !== "internal" && (
            <TextInput
              name="task_url"
              label="SmartLink / Offer Redirect URL (Task URL)"
              required
              defaultValue={task?.task_url ?? ""}
              placeholder="https://..."
              type="url"
            />
          )}

          {provider === "adsterra" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                name="provider_placement_id"
                label="Adsterra Placement ID"
                defaultValue={task?.provider_placement_id ?? ""}
                placeholder="Placement ID"
              />
              <TextInput
                name="provider_domain_id"
                label="Adsterra Domain ID"
                defaultValue={task?.provider_domain_id ?? ""}
                placeholder="Domain ID"
              />
              <input type="hidden" name="provider_tracking_param" value="psid" />
              <input type="hidden" name="provider_reconciliation_mode" value="api_reconciliation" />
              <input type="hidden" name="provider_status" value="needs_api_reconciliation" />
            </div>
          )}

          {provider === "cpagrip" && (
            <>
              <TextInput
                name="provider_tracking_param"
                label="Tracking Parameter"
                defaultValue={task?.provider_tracking_param ?? "subid"}
                placeholder="subid"
              />
              <input type="hidden" name="provider_reconciliation_mode" value="postback" />
              <input type="hidden" name="provider_status" value="postback_required" />
            </>
          )}

          {provider === "internal" && (
            <Select name="task_type" label="Internal Task Type" defaultValue={task?.task_type ?? "manual_review"} required>
              <option value="manual_review">Manual review</option>
              <option value="share_link">Share tracked link</option>
              <option value="visit_url">Visit campaign page</option>
              <option value="watch_media">Watch sponsored media</option>
            </Select>
          )}

          {/* Conditional Media Upload & URL for Internal Preview (Images/Videos) */}
          {provider === "internal" && (
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sponsored Ad Media (Image / Video)
              </label>

              {/* Preview Box */}
              {previewUrl && (
                <div className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-950 p-2 flex items-center justify-center max-h-48 min-h-[120px]">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      className="max-h-44 max-w-full rounded object-contain"
                    />
                  ) : (
                    // Native image keeps local upload preview blob URLs working.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Media preview"
                      className="max-h-44 max-w-full rounded object-contain"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition"
                    title="Remove Media"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* Drop-zone File Input */}
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-lg cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition duration-200">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    <Upload className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="text-xs text-slate-300 font-medium">
                      {selectedFile ? selectedFile.name : "Click to upload sponsored media"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      PNG, JPG, WEBP, GIF or MP4, WEBM (Max 50MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    name="mediaFile"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Fallback Media URL */}
              <div className="mt-1">
                <TextInput
                  name="media_url"
                  label="Or use an external Media URL"
                  defaultValue={previewUrl && !selectedFile ? previewUrl : ""}
                  placeholder="https://..."
                  type="url"
                  onChange={(e) => {
                    if (!selectedFile) {
                      setPreviewUrl(e.target.value);
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              name="reward_credits"
              label="Reward Credits"
              required
              type="number"
              min={0}
              defaultValue={task?.reward_credits}
              placeholder="100"
            />

            <TextInput
              name="limit_per_user"
              label="Daily Cap Per User"
              required
              type="number"
              min={1}
              defaultValue={task?.limit_per_user ?? (provider === "adsterra" ? 10 : 1)}
              placeholder="1"
            />
          </div>

          <TextInput
            name="global_cap"
            label="Global Campaign Cap"
            type="number"
            min={1}
            defaultValue={task?.global_cap ?? ""}
            placeholder="Optional"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <SubmitButton>{isEdit ? "Save Changes" : "Create Campaign"}</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
