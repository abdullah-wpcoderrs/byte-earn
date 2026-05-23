import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { signupFeeNaira } from "@/lib/config/pricing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ActivatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();

  if (!profile) {
    redirect("/");
  }

  if (profile.status === "onboarding") {
    redirect("/onboarding");
  }

  if (profile.status === "active") {
    redirect("/feed");
  }

  const feeNaira = signupFeeNaira();

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 text-[11px] text-white">
      <section className="glass-strong w-full max-w-md p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[5px] border border-cyan-200/20 bg-cyan-300/10">
            <Sparkles className="size-5 text-cyan-200" />
          </div>
          <div>
            <p className="text-base font-semibold">Activate byte-earn</p>
            <p className="text-muted">One-time network access payment</p>
          </div>
        </div>

        <div className="rounded-[5px] border border-cyan-200/15 bg-cyan-300/8 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-cyan-200" />
            <div>
              <p className="font-semibold text-cyan-50">Payment required</p>
              <p className="mt-2 leading-5 text-slate-300">
                Your profile is created, but the earning network unlocks only after Paystack verifies payment.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[5px] border border-white/10 bg-white/[0.045] p-4">
          <p className="text-muted">Signup fee</p>
          <p className="mt-1 text-[24px] font-semibold">NGN {feeNaira.toLocaleString("en-NG")}</p>
        </div>

        <form action="/api/paystack/initialize" className="mt-5" method="post">
          <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200">
            <CreditCard className="size-4" />
            Continue to Paystack
          </button>
        </form>
      </section>
    </main>
  );
}
