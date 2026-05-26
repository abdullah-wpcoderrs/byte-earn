import { BadgeCheck } from "lucide-react";

export type DisplayBadge = {
  color: string;
  id: string;
  imageUrl: string | null;
  name: string;
};

type ProfileBadgesProps = {
  badges: DisplayBadge[];
  compact?: boolean;
};

export function ProfileBadges({ badges, compact = false }: ProfileBadgesProps) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.slice(0, compact ? 3 : 8).map((badge) => (
        <span
          className="inline-flex min-h-7 items-center gap-1.5 rounded-[5px] border border-white/10 bg-white/[0.065] px-2 text-[11px] font-semibold text-slate-100"
          key={badge.id}
          title={badge.name}
        >
          {badge.imageUrl ? (
            <span aria-hidden="true" className="size-4 rounded-[3px] bg-cover bg-center" style={{ backgroundImage: `url(${badge.imageUrl})` }} />
          ) : (
            <BadgeCheck className="size-3.5" style={{ color: badge.color }} />
          )}
          <span className="max-w-24 truncate">{badge.name}</span>
        </span>
      ))}
      {badges.length > (compact ? 3 : 8) ? (
        <span className="inline-flex min-h-7 items-center rounded-[5px] border border-white/10 bg-white/[0.045] px-2 text-[11px] font-semibold text-slate-300">
          +{badges.length - (compact ? 3 : 8)}
        </span>
      ) : null}
    </div>
  );
}
