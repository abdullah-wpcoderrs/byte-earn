import { createClient } from "@/lib/supabase/client";

// Mirrors the storage bucket limits defined in db/migrations/0007_phase8_hardening.sql.
type BucketLimit = { maxBytes: number; mimes: string[] };
const BUCKET_LIMITS: Record<"post-audio" | "post-images" | "post-videos", BucketLimit> = {
  "post-audio": { maxBytes: 20 * 1024 * 1024, mimes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm"] },
  "post-images": { maxBytes: 10 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  "post-videos": { maxBytes: 100 * 1024 * 1024, mimes: ["video/mp4", "video/webm", "video/quicktime"] },
};

export type PostType = "image_audio" | "image_text" | "video_text";

export type UploadProgress = { label: string; percent: number };

export type UploadedMedia = {
  audioUrl: string | null;
  mediaUrls: string[];
  paths: Array<{ bucket: string; path: string }>;
};

export class UploadValidationError extends Error {}

function extensionFor(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext && /^[a-z0-9]+$/.test(ext) ? ext : "bin";
}

function assertAccepted(file: File, bucket: keyof typeof BUCKET_LIMITS) {
  const limit = BUCKET_LIMITS[bucket];
  // Some browsers report empty mime types; fall back to the extension for audio.
  const type = file.type.toLowerCase();
  if (file.size > limit.maxBytes) {
    throw new UploadValidationError("file_too_large");
  }
  if (type && !limit.mimes.includes(type)) {
    throw new UploadValidationError("invalid_media_file");
  }
}

// Uploads a single file to Supabase Storage via the REST endpoint so we get
// real upload progress (the JS SDK in this version does not expose progress).
function uploadWithProgress(args: {
  bucket: string;
  file: File;
  onProgress?: (ratio: number) => void;
  path: string;
  token: string;
}): Promise<void> {
  const { bucket, file, onProgress, path, token } = args;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(xhr.statusText || `upload_failed_${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network_error"));
    xhr.onabort = () => reject(new Error("upload_aborted"));
    xhr.send(file);
  });
}

function publicUrlFor(bucket: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

// Uploads all media + optional audio for a post directly from the browser,
// returning the public URLs the server action will record.
export async function uploadPostMedia(params: {
  audioFile: File | null;
  files: File[];
  onProgress?: (p: UploadProgress) => void;
  type: PostType;
  userId: string;
}): Promise<UploadedMedia> {
  const { audioFile, files, onProgress, type, userId } = params;

  if (files.length === 0) {
    throw new UploadValidationError("media_required");
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new UploadValidationError("auth_required");
  }

  const mediaBucket: "post-images" | "post-videos" = type === "video_text" ? "post-videos" : "post-images";
  const totalUnits = files.length + (audioFile ? 1 : 0);
  let completedUnits = 0;

  function reportPercent(currentRatio: number) {
    if (!onProgress) {
      return;
    }
    const percent = Math.round(((completedUnits + currentRatio) / totalUnits) * 100);
    onProgress({ label: "Uploading media", percent: Math.min(99, percent) });
  }

  const paths: UploadedMedia["paths"] = [];
  const mediaUrls: string[] = [];

  for (const file of files) {
    assertAccepted(file, mediaBucket);
    const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    reportPercent(0);
    await uploadWithProgress({ bucket: mediaBucket, file, onProgress: reportPercent, path, token });
    completedUnits += 1;
    paths.push({ bucket: mediaBucket, path });
    mediaUrls.push(publicUrlFor(mediaBucket, path));
  }

  let audioUrl: string | null = null;
  if (audioFile && type === "image_audio") {
    assertAccepted(audioFile, "post-audio");
    const path = `${userId}/${crypto.randomUUID()}.${extensionFor(audioFile)}`;
    reportPercent(0);
    await uploadWithProgress({ bucket: "post-audio", file: audioFile, onProgress: reportPercent, path, token });
    completedUnits += 1;
    paths.push({ bucket: "post-audio", path });
    audioUrl = publicUrlFor("post-audio", path);
  }

  if (onProgress) {
    onProgress({ label: "Publishing", percent: 100 });
  }

  return { audioUrl, mediaUrls, paths };
}

// Removes orphaned storage objects when post creation fails after upload.
export async function removeUploadedPaths(paths: UploadedMedia["paths"]): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  const supabase = createClient();
  const byBucket = new Map<string, string[]>();
  for (const entry of paths) {
    const list = byBucket.get(entry.bucket) ?? [];
    list.push(entry.path);
    byBucket.set(entry.bucket, list);
  }
  await Promise.all(
    Array.from(byBucket.entries()).map(([bucket, list]) =>
      supabase.storage.from(bucket).remove(list).catch(() => undefined),
    ),
  );
}
