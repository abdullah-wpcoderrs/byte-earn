import { CheckCircle2, Clock, Users, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function ReferralList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: referrals, error } = await supabase
    .from("referral_attributions")
    .select(`
      id,
      status,
      created_at,
      rejection_reason,
      referredProfile:profiles!referred_profile_id(username, display_name)
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
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/40 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {referrals.map((referral: any) => {
                const profile = Array.isArray(referral.referredProfile) ? referral.referredProfile[0] : referral.referredProfile;
                const displayName = profile?.display_name || profile?.username || "Unknown User";

                return (
                  <tr key={referral.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {displayName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {referral.status === "pending" && <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 px-2.5 py-1 text-xs font-medium text-yellow-400"><Clock className="size-3.5" /> Pending Payment</span>}
                      {referral.status === "onboarding" && <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/10 px-2.5 py-1 text-xs font-medium text-blue-400"><Clock className="size-3.5" /> Onboarding</span>}
                      {referral.status === "qualified" && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="size-3.5" /> Qualified</span>}
                      {referral.status === "rejected" && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400" title={referral.rejection_reason || "Rejected"}><XCircle className="size-3.5" /> Rejected</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
