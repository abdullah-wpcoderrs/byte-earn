export type SponsoredTaskMilestone = {
  credits: number;
  seconds: number;
};

export type SponsoredTask = {
  dailyCapSeconds: number;
  id: string;
  milestones: SponsoredTaskMilestone[];
  sponsor: string;
  title: string;
  videoUrl: string;
};

export const sponsoredTasks: SponsoredTask[] = [
  {
    dailyCapSeconds: 420,
    id: "airdrop-preview",
    milestones: [
      { seconds: 20, credits: 15 },
      { seconds: 45, credits: 25 },
      { seconds: 75, credits: 40 },
    ],
    sponsor: "Airdrop Desk",
    title: "Daily airdrop explainer",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    dailyCapSeconds: 420,
    id: "moviebox-style",
    milestones: [
      { seconds: 15, credits: 10 },
      { seconds: 40, credits: 25 },
      { seconds: 70, credits: 35 },
    ],
    sponsor: "Moviebox Partner",
    title: "Sponsored trailer task",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
  },
];

export function formatWatchTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}
