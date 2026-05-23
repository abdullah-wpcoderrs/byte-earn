import { SponsoredTaskPlayer } from "@/components/tasks/sponsored-task-player";
import { sponsoredTasks } from "@/lib/tasks";

export default function TasksPage() {
  return <SponsoredTaskPlayer tasks={sponsoredTasks} />;
}
