import { SponsoredTaskPlayer } from "@/components/tasks/sponsored-task-player";
import { getPlatformSettings } from "@/lib/platform-settings";
import { getConfiguredSponsoredTasks } from "@/lib/tasks-data";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const settings = await getPlatformSettings();
  const tasks = await getConfiguredSponsoredTasks(settings.daily_watch_limit_seconds);

  return <SponsoredTaskPlayer tasks={tasks} />;
}
