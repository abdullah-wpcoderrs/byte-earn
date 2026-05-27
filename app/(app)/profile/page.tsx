import { Link2, LogOut, SquarePlus } from "lucide-react";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { ProfilePostTabs } from "@/components/profile/profile-post-tabs";
import { ProfileBadges } from "@/components/profile/profile-badges";
import { ReferralShareButton } from "@/components/share/referral-share-button";
import { getOwnProfileData } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const data = await getOwnProfileData();

  if (!data) {
    redirect("/");
  }

  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://appdomain.com"}/ref/${data.profile.referralCode}`;

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-[5px] border border-cyan-200/25 bg-cyan-300/10 text-base font-semibold">{data.profile.initials}</div>
            <div>
              <h1 className="text-base font-semibold">{data.profile.displayName ?? "Creator"}</h1>
              <p className="mt-1 text-muted">
                {data.posts.length} posts - {data.profile.referralCount} referrals
              </p>
              <div className="mt-2">
                <ProfileBadges badges={data.profile.badges} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950" href="/upload">
              <SquarePlus className="size-4" />
              New post
            </a>
            <form action={signOutAction}>
              <Button icon={<LogOut className="size-4" />} type="submit" variant="danger">
                Logout
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
          <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
            <div className="mb-2 flex items-center gap-2 text-cyan-100">
              <Link2 className="size-4" />
              <span className="font-semibold">Referral URL</span>
            </div>
            <p className="break-all text-slate-300">{referralUrl}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <ReferralShareButton
              action="copy-url"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.065] px-3 font-semibold text-slate-100"
              label="Copy"
              referralCode={data.profile.referralCode}
            />
            <ReferralShareButton
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950"
              label="Share"
              referralCode={data.profile.referralCode}
            />
          </div>
        </div>
      </section>

      <ProfilePostTabs pendingPosts={data.pendingPosts} publishedPosts={data.publishedPosts} rejectedPosts={data.rejectedPosts} savedPosts={data.savedPosts} />
    </div>
  );
}
