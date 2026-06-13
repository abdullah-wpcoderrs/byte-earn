import { Link2, LogOut, SquarePlus } from "lucide-react";
import { redirect } from "next/navigation";
import { updateOwnProfileAction } from "./actions";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { ProfilePostTabs } from "@/components/profile/profile-post-tabs";
import { ProfileBadges } from "@/components/profile/profile-badges";
import { ReferralList } from "@/components/profile/referral-list";
import { ReferralShareButton } from "@/components/share/referral-share-button";
import { UsernameField } from "@/components/forms/username-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatNaira } from "@/lib/money";
import { getOwnProfileData } from "@/lib/posts";
import { getReferralProgramSummary } from "@/lib/referral-summary";
import { getRequestOrigin } from "@/lib/request-origin";
import { buildReferralUrl } from "@/lib/share";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const errorParam = typeof params.error === "string" ? params.error : undefined;
  const updatedParam = typeof params.updated === "string" ? params.updated : undefined;

  const data = await getOwnProfileData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!data || !user) {
    redirect("/");
  }

  const [referralUrl, referralSummary] = await Promise.all([
    buildReferralUrl(data.profile.referralCode, await getRequestOrigin()),
    getReferralProgramSummary(user.id),
  ]);

  return (
    <div className="grid gap-4">
      {errorParam && (
        <div className="rounded-[5px] border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-xs font-semibold">
          {errorParam === "invalid_name" && "Display name must be at least 2 characters."}
          {errorParam === "invalid_username" && "Username must be 3-24 lowercase letters, numbers, or underscores."}
          {errorParam === "reserved_username" && "This username is reserved and cannot be used."}
          {errorParam === "invalid_bank_name" && "Bank name must be between 2 and 100 characters."}
          {errorParam === "invalid_account_number" && "Account number must be numeric and exactly 10 digits."}
          {errorParam === "invalid_account_name" && "Account name must be between 2 and 100 characters."}
          {errorParam === "username_taken" && "This username is already taken."}
          {!["invalid_name", "invalid_username", "reserved_username", "invalid_bank_name", "invalid_account_number", "invalid_account_name", "username_taken"].includes(errorParam) && decodeURIComponent(errorParam)}
        </div>
      )}
      {updatedParam === "profile_saved" && (
        <div className="rounded-[5px] border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200 text-xs font-semibold">
          Profile and payout details saved successfully!
        </div>
      )}

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
            <span className="inline-flex h-8 items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white">
              Edit profile
            </span>
          </summary>
          <div className="mt-4">
            <p className="text-base font-semibold">Edit profile</p>
            <p className="mt-1 leading-5 text-muted">Update your display name, username, and payout details.</p>
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
            <UsernameField
              currentValue={data.profile.username}
              defaultValue={data.profile.username ?? ""}
              label="Username"
              name="username"
              placeholder="amina_kareem"
            />

            <label className="grid gap-2">
              <span className="font-medium text-slate-200">Bank Name</span>
              <input
                className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                defaultValue={data.profile.bankName ?? ""}
                minLength={2}
                maxLength={100}
                name="bankName"
                placeholder="Access Bank"
                required
                type="text"
              />
            </label>
            <label className="grid gap-2">
              <span className="font-medium text-slate-200">Account Number</span>
              <input
                className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                defaultValue={data.profile.accountNumber ?? ""}
                maxLength={10}
                minLength={10}
                name="accountNumber"
                pattern="[0-9]{10}"
                placeholder="0123456789"
                required
                type="text"
              />
            </label>
            <label className="grid gap-2">
              <span className="font-medium text-slate-200">Account Name</span>
              <input
                className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                defaultValue={data.profile.accountName ?? ""}
                minLength={2}
                maxLength={100}
                name="accountName"
                placeholder="Amina Kareem"
                required
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
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <ProfileInfoCard
            label="Referral bonus"
            value={`${referralSummary.referralBonusCredits.toLocaleString("en-US")} credits (${formatNaira(referralSummary.referralBonusNaira)})`}
          />
          <ProfileInfoCard label="Qualified" value={referralSummary.stats.qualifiedCount.toLocaleString("en-US")} />
          <ProfileInfoCard label="Pending" value={referralSummary.stats.pendingCount.toLocaleString("en-US")} />
          <ProfileInfoCard
            label="Referral earned"
            value={`${referralSummary.rewardCreditsTotal.toLocaleString("en-US")} credits (${formatNaira(referralSummary.rewardCreditsTotalNaira)})`}
          />
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
          <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
            <div className="mb-2 flex items-center gap-2 text-cyan-100">
              <Link2 className="size-4" />
              <span className="font-semibold">Referral URL</span>
            </div>
            <p className="break-all text-slate-300">{referralUrl}</p>
            <p className="mt-2 text-slate-400">
              {referralSummary.stats.visitCount.toLocaleString("en-US")} visits - {referralSummary.stats.rejectedCount.toLocaleString("en-US")} rejected - ledger total {referralSummary.referralLedgerCredits.toLocaleString("en-US")} credits
            </p>
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

      <ReferralList userId={user.id} />

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
