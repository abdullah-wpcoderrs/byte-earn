import { CheckCircle2, Clock, Users, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ReferralProfile = {
  display_name: string | null;
  status: "active" | "onboarding" | "pending_payment" | "suspended";
  username: string | null;
};

type ReferralRow = {
  created_at: string;
  id: string;
  qualified_at: string | null;
  referredProfile: ReferralProfile | ReferralProfile[] | null;
  rejection_reason: string | null;
  reward_credits: number;
  status: "pending" | "qualified" | "rejected";
};

function referralStage(referral: ReferralRow, profile: ReferralProfile | null | undefined) {
  if (referral.status === "qualified") return "Qualified";
  if (referral.status === "rejected") return "Rejected";
  if (profile?.status === "onboarding") return "Onboarding";
  if (profile?.status === "active") return "Pending qualification";
  return "Pending payment";
}

function StatusBadge({ referral, profile }: { referral: ReferralRow; profile: ReferralProfile | null | undefined }) {
  const stage = referralStage(referral, profile);

  if (referral.status === "qualified") {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="size-3.5" /> {stage}</span>;
  }

  if (referral.status === "rejected") {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400" title={referral.rejection_reason || "Rejected"}><XCircle className="size-3.5" /> {stage}</span>;
  }

  return <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 px-2.5 py-1 text-xs font-medium text-yellow-400"><Clock className="size-3.5" /> {stage}</span>;
}

export async function ReferralList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: referrals, error } = await supabase
    .from("referral_attributions")
    .select(`
      id,
      status,
      created_at,
      qualified_at,
      rejection_reason,
      reward_credits,
      referredProfile:profiles!referred_profile_id(username, display_name, status)
    `)
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (error || !referrals) {
    return null;
  }

  return (
    <div className="glass-strong mt-5 overflow-hidden rounded-[5px]">
      <div className="flex items-center gap-2 border-b border-white/5 bg-slate-900/50 p-4 font-semibold text-slate-200">
        <Users className="size-5 text-cyan-200" />
        Your Referrals
      </div>
      <div className="overflow-x-auto">
        {referrals.length === 0 ? (
          <div className="p-6 text-center text-slate-500">You haven&apos;t referred anyone yet. Share your link to start earning!</div>
        ) : (
          <>
            <div className="grid gap-2 p-3 md:hidden">
              {referrals.map((referral: ReferralRow) => {
                const profile = Array.isArray(referral.referredProfile) ? referral.referredProfile[0] : referral.referredProfile;
                const displayName = profile?.display_name || profile?.username || "Unknown User";

                return (
                  <div key={referral.id} className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-100">{displayName}</p>
                        <p className="mt-1 text-slate-400">Joined {new Date(referral.created_at).toLocaleDateString()}</p>
                      </div>
                      <StatusBadge referral={referral} profile={profile} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Reward</p>
                        <p className="mt-1">{referral.reward_credits.toLocaleString("en-US")} credits</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Qualified</p>
                        <p className="mt-1">{referral.qualified_at ? new Date(referral.qualified_at).toLocaleDateString() : "-"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <table className="hidden w-full text-left text-sm text-slate-300 md:table">
              <thead className="bg-slate-900/40 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Reward</th>
                  <th className="px-4 py-3">Qualified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {referrals.map((referral: ReferralRow) => {
                  const profile = Array.isArray(referral.referredProfile) ? referral.referredProfile[0] : referral.referredProfile;
                  const displayName = profile?.display_name || profile?.username || "Unknown User";

                  return (
                    <tr key={referral.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-slate-200">{displayName}</td>
                      <td className="whitespace-nowrap px-4 py-3">{new Date(referral.created_at).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge referral={referral} profile={profile} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-cyan-100">
                        {referral.reward_credits.toLocaleString("en-US")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {referral.qualified_at ? new Date(referral.qualified_at).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
