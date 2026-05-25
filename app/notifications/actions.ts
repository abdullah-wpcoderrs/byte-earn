"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = formData.get("notificationId");
  if (typeof notificationId !== "string") {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase.from("notification_reads").upsert({
    notification_id: notificationId,
    profile_id: user.id,
    read_at: new Date().toISOString(),
  });

  revalidatePath("/feed");
  revalidatePath("/admin");
}
