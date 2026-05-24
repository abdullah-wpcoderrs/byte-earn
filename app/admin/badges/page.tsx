import { BadgeCheck } from "lucide-react";
import { getAdminBadges } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const badges = await getAdminBadges();

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Created badge assets, labels, colors, and descriptions</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Badges</h1>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {badges.map((badge) => (
          <article className="glass grid gap-3 p-4" key={badge.id}>
            <div className="flex items-start gap-3">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[5px] border border-white/10 bg-white/[0.055]">
                {badge.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="size-full object-cover" src={badge.imageUrl} />
                ) : (
                  <BadgeCheck className="size-6" style={{ color: badge.color }} />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-100">{badge.name}</p>
                <p className="mt-1 text-muted">{badge.createdBy ?? "Admin"}</p>
              </div>
            </div>
            <p className="leading-5 text-slate-300">{badge.description}</p>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="inline-flex items-center gap-2 text-slate-300">
                <span className="size-3 rounded-full border border-white/10" style={{ backgroundColor: badge.color }} />
                {badge.color}
              </span>
              <time className="text-slate-500">{badge.createdAt.toLocaleDateString("en-NG")}</time>
            </div>
          </article>
        ))}
      </section>

      {badges.length === 0 ? (
        <div className="glass grid min-h-32 place-items-center gap-2 p-4 text-muted">
          <BadgeCheck className="size-5" />
          No badges have been created yet.
        </div>
      ) : null}
    </div>
  );
}
