import { Link2, LogOut, SquarePlus } from "lucide-react";
import { redirect } from "next/navigation";
import { updateOwnProfileAction } from "./actions";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { ProfilePostTabs } from "@/components/profile/profile-post-tabs";
import { ProfileBadges } from "@/components/profile/profile-badges";
import { ReferralShareButton } from "@/components/share/referral-share-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getOwnProfileData } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const data = await getOwnProfileData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!data || !user) {
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
              <h1 className="text-base font-semibold">{data.profile.displayName ?? data.profile.username ?? "Creator"}</h1>
              <p className="mt-1 text-cyan-100">{data.profile.username ? `@${data.profile.username}` : "Add a username to show on posts"}</p>
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
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ProfileInfoCard label="Full name" value={data.profile.displayName ?? "Not set yet"} />
          <ProfileInfoCard label="Username" value={data.profile.username ? `@${data.profile.username}` : "Not set yet"} />
          <ProfileInfoCard label="Email address" value={user.email ?? "Not available"} />
        </div>
        <details className="mt-5 rounded-[5px] border border-white/10 bg-white/[0.035] p-4">
          <summary className="cursor-pointer list-none text-base font-semibold text-white marker:hidden">
            <span className="inline-flex min-h-10 items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.065] px-3 font-semibold text-slate-100">
              Edit profile
            </span>
          </summary>
          <div className="mt-4">
            <p className="text-base font-semibold">Edit profile</p>
            <p className="mt-1 leading-5 text-muted">Update the name shown on your profile and the username shown on posts.</p>
          </div>
          <form action={updateOwnProfileAction} className="mt-4 grid gap-3 lg:grid-cols-3">
            <label className="grid gap-2">
              <span className="font-medium text-slate-200">Email address</span>
              <input
                className="min-h-9 cursor-not-allowed rounded-[5px] border border-white/10 bg-white/[0.035] px-2.5 text-slate-400 outline-none"
                disabled
                readOnly
                type="email"
                value={user.email ?? ""}
              />
            </label>
            <label className="grid gap-2">
              <span className="font-medium text-slate-200">Full name</span>
              <input
                className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                defaultValue={data.profile.displayName ?? ""}
                maxLength={80}
                name="displayName"
                placeholder="Amina Kareem"
                required
                type="text"
              />
            </label>
            <label className="grid gap-2">
              <span className="font-medium text-slate-200">Username</span>
              <input
                className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                defaultValue={data.profile.username ?? ""}
                maxLength={24}
                name="username"
                pattern="[a-z0-9_]{3,24}"
                placeholder="amina_kareem"
                required
                spellCheck={false}
                type="text"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
              <SubmitButton pendingLabel="Saving..." type="submit">
                Save profile
              </SubmitButton>
              <p className="text-muted">Use 3 to 24 lowercase letters, numbers, or underscores.</p>
            </div>
          </form>
        </details>
      </section>

      <section className="glass-strong p-4">
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

function ProfileInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">{label}</p>
      <p className="mt-2 break-words text-sm text-slate-100">{value}</p>
    </div>
  );
}
