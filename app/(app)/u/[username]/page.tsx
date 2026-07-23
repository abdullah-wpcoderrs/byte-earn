import { notFound } from "next/navigation";
import { ProfileBadges } from "@/components/profile/profile-badges";
import { PostGrid } from "@/components/profile/post-grid";
import { ReferralShareButton } from "@/components/share/referral-share-button";
import { getPublicProfileData } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getPublicProfileData(username);

  if (!data) {
    notFound();
  }

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-[5px] border border-cyan-200/25 bg-cyan-300/10 text-base font-semibold">
              {data.profile.initials}
            </div>
            <div>
              <h1 className="text-base font-semibold">{data.profile.displayName ?? data.profile.username ?? "Creator"}</h1>
              <p className="mt-1 text-cyan-100">{data.profile.username ? `@${data.profile.username}` : `Referral: ${data.profile.referralCode}`}</p>
              <p className="mt-1 text-muted">
                {data.posts.length} published posts - {data.profile.referralCount} referrals
              </p>
              <div className="mt-2">
                <ProfileBadges badges={data.profile.badges} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <ReferralShareButton
              action="copy-url"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.065] px-3 font-semibold text-slate-100"
              label="Referral"
              referralCode={data.profile.referralCode}
            />
            <ReferralShareButton referralCode={data.profile.referralCode} />
          </div>
        </div>
      </section>

      <section className="glass p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Published posts</h2>
          <p className="text-muted">Safe public grid</p>
        </div>
        <PostGrid posts={data.posts} />
      </section>
    </div>
  );
}
