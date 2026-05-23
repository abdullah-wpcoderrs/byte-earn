import { Banknote, Link2, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { completeOnboardingAction } from "./actions";
import { profiles } from "@/db/schema";
import { getDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const profile = await getDb().query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  if (!profile || profile.status === "pending_payment") {
    redirect("/activate");
  }

  if (profile.status === "active") {
    redirect("/feed");
  }

  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://appdomain.com"}/ref=${profile.referralCode}`;

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
          <div className="mb-2 flex items-center gap-2 text-cyan-100">
            <Banknote className="size-4" />
            <span className="font-semibold">Payout profile</span>
          </div>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Display name</span>
            <input
              className="min-h-11 border border-white/10 bg-white/[0.055] px-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.displayName ?? ""}
              name="displayName"
              placeholder="Amina Kareem"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Bank name</span>
            <input
              className="min-h-11 border border-white/10 bg-white/[0.055] px-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.bankName ?? ""}
              name="bankName"
              placeholder="Access Bank"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Account number</span>
            <input
              className="min-h-11 border border-white/10 bg-white/[0.055] px-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.accountNumber ?? ""}
              name="accountNumber"
              placeholder="0123456789"
              type="text"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Account name</span>
            <input
              className="min-h-11 border border-white/10 bg-white/[0.055] px-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              defaultValue={profile.accountName ?? ""}
              name="accountName"
              placeholder="Amina Kareem"
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
