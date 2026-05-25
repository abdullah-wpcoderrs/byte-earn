import { SponsoredTaskPlayer } from "@/components/tasks/sponsored-task-player";
import { getPlatformSettings } from "@/lib/platform-settings";
import { sponsoredTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const settings = await getPlatformSettings();
  const tasks = sponsoredTasks.map((task) => ({
    ...task,
    dailyCapSeconds: settings.daily_watch_limit_seconds,
  }));

  return <SponsoredTaskPlayer tasks={tasks} />;
}
