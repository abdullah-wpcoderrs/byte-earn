import { Banknote, Link2, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { completeOnboardingAction } from "./actions";
import { formatNaira } from "@/lib/money";
import { getReferralProgramSummary } from "@/lib/referral-summary";
import { getRequestOrigin } from "@/lib/request-origin";
import { buildReferralUrl } from "@/lib/share";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const errorParam = typeof params.error === "string" ? params.error : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, referral_code, display_name, bank_name, account_number, account_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/activate");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (profile.status === "pending_payment") {
    redirect("/activate");
  }

  if (profile.status === "active") {
    redirect("/feed");
  }

  const [referralUrl, referralSummary] = await Promise.all([
    buildReferralUrl(profile.referral_code, await getRequestOrigin()),
    getReferralProgramSummary(user.id),
  ]);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 text-[11px] text-white">
      <section className="grid w-full max-w-4xl gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="glass-strong p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-[5px] border border-cyan-200/20 bg-cyan-300/10">
              <UserRound className="size-5 text-cyan-200" />
            </div>
            <div>
              <p className="text-base font-semibold">Profile onboarding</p>
              <p className="text-muted">Required before entering the app</p>
            </div>
          </div>

          <div className="rounded-[5px] border border-cyan-200/15 bg-cyan-300/8 p-4">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 size-5 shrink-0 text-cyan-200" />
              <div>
                <p className="font-semibold text-cyan-50">Referral URL ready</p>
                <p className="mt-2 break-all leading-5 text-slate-300">{referralUrl}</p>
                <p className="mt-2 leading-5 text-slate-400">
                  Current bonus: {referralSummary.referralBonusCredits.toLocaleString("en-US")} credits ({formatNaira(referralSummary.referralBonusNaira)}) per qualified referral.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[5px] border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-cyan-200" />
              <p className="leading-5 text-slate-300">
                Bank details are stored on your profile and prefilled later for withdrawal requests.
              </p>
            </div>
          </div>
        </aside>

        <form action={completeOnboardingAction} className="glass-strong grid gap-3 p-5">
          {errorParam && (
            <div className="rounded-[5px] border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-xs font-semibold">
              {errorParam === "invalid_name" && "Display name must be at least 2 characters."}
              {errorParam === "invalid_bank_name" && "Bank name must be between 2 and 100 characters."}
              {errorParam === "invalid_account_number" && "Account number must be numeric and exactly 10 digits."}
              {errorParam === "invalid_account_name" && "Account name must be between 2 and 100 characters."}
              {!["invalid_name", "invalid_bank_name", "invalid_account_number", "invalid_account_name"].includes(errorParam) && "We could not save onboarding. Please try again."}
            </div>
          )}
          <div className="mb-2 flex items-center gap-2 text-cyan-100">
            <Banknote className="size-4" />
            <span className="font-semibold">Payout profile</span>
          </div>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Email address</span>
            <input
              className="min-h-9 cursor-not-allowed border border-white/10 bg-white/[0.035] px-2.5 text-slate-400 outline-none"
              disabled
              readOnly
              type="email"
              value={user.email ?? ""}
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Display name</span>
            <input
              className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.display_name ?? ""}
              minLength={2}
              maxLength={80}
              name="displayName"
              placeholder="Amina Kareem"
              required
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Bank name</span>
            <input
              className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.bank_name ?? ""}
              minLength={2}
              maxLength={100}
              name="bankName"
              placeholder="Access Bank"
              required
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Account number</span>
            <input
              className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.account_number ?? ""}
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
            <span className="font-medium text-slate-200">Account name</span>
            <input
              className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.account_name ?? ""}
              minLength={2}
              maxLength={100}
              name="accountName"
              placeholder="Amina Kareem"
              required
              type="text"
            />
          </label>

          <button className="mt-2 inline-flex min-h-10 items-center justify-center rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200">
            Complete onboarding
          </button>
        </form>
      </section>
    </main>
  );
}
