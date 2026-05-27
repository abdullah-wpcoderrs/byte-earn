import "server-only";

import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";

async function logMediaCleanupFailure(message: string, metadata: string) {
  if (!hasSupabaseAdminKey()) return;

  const supabase = createAdminClient();
  await supabase.rpc("log_system_failure", {
    failure_category: "post_media_cleanup",
    failure_message: message,
    failure_metadata: metadata,
  });
}

const postBuckets = new Set(["post-audio", "post-images", "post-videos"]);

function storageObjectFromPublicUrl(publicUrl: string | null) {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = "/storage/v1/object/public/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const objectPath = url.pathname.slice(markerIndex + marker.length);
    const [bucket, ...pathParts] = objectPath.split("/");
    const path = decodeURIComponent(pathParts.join("/"));

    if (!postBuckets.has(bucket) || !path) return null;
    return { bucket: bucket as "post-audio" | "post-images" | "post-videos", path };
  } catch {
    return null;
  }
}

export async function removePostMediaFiles(urls: Array<string | null>) {
  if (!hasSupabaseAdminKey()) return;

  const supabase = createAdminClient();
  const pathsByBucket = new Map<"post-audio" | "post-images" | "post-videos", string[]>();

  urls.forEach((url) => {
    const object = storageObjectFromPublicUrl(url);
    if (!object) return;
    const current = pathsByBucket.get(object.bucket) ?? [];
    current.push(object.path);
    pathsByBucket.set(object.bucket, current);
  });

  for (const [bucket, paths] of pathsByBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      await logMediaCleanupFailure(error.message, JSON.stringify({ bucket, paths })).catch(() => undefined);
      throw new Error(error.message);
    }
  }
}

export function postMediaUrls(mediaUrl: string | null, mediaUrls: string | null | undefined, audioUrl: string | null) {
  const urls = new Set<string>();
  if (mediaUrl) urls.add(mediaUrl);
  if (audioUrl) urls.add(audioUrl);

  if (mediaUrls) {
    try {
      const parsed = JSON.parse(mediaUrls);
      if (Array.isArray(parsed)) {
        parsed.forEach((url) => {
          if (typeof url === "string" && url.length > 0) {
            urls.add(url);
          }
        });
      }
    } catch {
      return Array.from(urls);
    }
  }

  return Array.from(urls);
}
