"use client";

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CreditCard,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { signInAction, signUpAction } from "@/app/auth/actions";
import { ByteEarnLogo } from "@/components/brand/byte-earn-logo";

const activationSteps = [
  "Pay one-time access fee",
  "Verify Paystack callback",
  "Complete profile and bank details",
  "Receive branded referral URL",
];

const earningSignals = [
  { label: "Referral unlock", value: "Instant", icon: Users },
  { label: "Activation gate", value: "Paystack", icon: CreditCard },
  { label: "Payout profile", value: "Bank ready", icon: Banknote },
];

type AuthMode = "signup" | "signin";

export default function AuthGatewayPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [showPassword, setShowPassword] = useState(false);

  const formTitle = useMemo(() => (mode === "signup" ? "Create your earning account" : "Sign in to your account"), [mode]);

  const formSubtitle = useMemo(
    () =>
      mode === "signup"
        ? "Start with authentication, then continue to the Paystack activation gateway."
        : "Return to your feed, wallet, tasks, referrals, and creator dashboard.",
    [mode],
  );

  return (
    <main className="min-h-screen text-[11px] text-white lg:overflow-hidden">
      <section className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <div className="relative flex min-h-[48svh] flex-col justify-between overflow-hidden border-b border-white/10 px-4 py-5 sm:px-6 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-10 lg:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(95,215,255,0.26),transparent_20rem),linear-gradient(150deg,rgba(10,14,26,0.42),rgba(3,7,18,0.94)_60%),url('https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,26,0.22),rgba(10,14,26,0.98))]" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <Brand />
            <div className="hidden items-center gap-2 rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-cyan-100 backdrop-blur sm:inline-flex">
              <ShieldCheck className="size-4" />
              Secured access
            </div>
          </div>

          <div className="relative z-10 max-w-xl py-10 lg:py-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-[5px] border border-white/15 bg-black/24 px-3 py-2 text-cyan-100 backdrop-blur">
              <Sparkles className="size-4" />
              AI social earning network
            </div>
            <h1 className="max-w-lg text-[28px] font-semibold leading-[1.04] tracking-normal">
              Pay once. Post, share, watch, and earn from your network.
            </h1>
            <p className="mt-5 max-w-md leading-5 text-slate-200">
              byte-earn gates the network with verified activation, then routes every creator into profile setup and referral growth.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 pb-2 sm:grid-cols-3">
            {earningSignals.map((signal) => (
              <div className="glass px-3 py-3" key={signal.label}>
                <signal.icon className="mb-3 size-5 text-cyan-200" />
                <p className="text-muted">{signal.label}</p>
                <p className="mt-1 text-base font-semibold">{signal.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-center px-4 py-6 sm:px-6 lg:h-screen lg:min-h-screen lg:overflow-y-auto lg:px-10">
          <div className="w-full max-w-[440px] lg:sticky lg:top-6">
            <div className="glass-strong p-4 sm:p-5">
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-[5px] border border-white/10 bg-white/[0.045] p-1">
                <button
                  className={`flex min-h-9 items-center justify-center gap-2 rounded-[5px] px-2 font-semibold transition ${
                    mode === "signup" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/8"
                  }`}
                  onClick={() => setMode("signup")}
                  type="button"
                >
                  <UserPlus className="size-4" />
                  Join
                </button>
                <button
                  className={`flex min-h-9 items-center justify-center gap-2 rounded-[5px] px-2 font-semibold transition ${
                    mode === "signin" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/8"
                  }`}
                  onClick={() => setMode("signin")}
                  type="button"
                >
                  <LockKeyhole className="size-4" />
                  Sign in
                </button>
              </div>

              <div>
                <p className="text-[22px] font-semibold leading-tight">{formTitle}</p>
                <p className="mt-2 leading-5 text-muted">{formSubtitle}</p>
              </div>

              <form action={mode === "signup" ? signUpAction : signInAction} className="mt-5 grid gap-3">
                {mode === "signup" ? (
                  <>
                    <label className="grid gap-2">
                      <span className="font-medium text-slate-200">Full name</span>
                      <input
                        className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                        name="displayName"
                        placeholder="Amina Kareem"
                      required
                        type="text"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="font-medium text-slate-200">Username</span>
                      <input
                        className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                        maxLength={24}
                        name="username"
                        pattern="[a-z0-9_]{3,24}"
                        placeholder="amina_kareem"
                        required
                        spellCheck={false}
                        type="text"
                      />
                    </label>
                  </>
                ) : null}

                <label className="grid gap-2">
                  <span className="font-medium text-slate-200">Email address</span>
                  <div className="flex min-h-9 items-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 transition focus-within:border-cyan-200/55">
                    <Mail className="size-4 text-slate-400" />
                    <input
                      className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                      name="email"
                      placeholder="you@example.com"
                      type="email"
                    />
                  </div>
                </label>

                <div className="grid gap-2">
                  <label className="font-medium text-slate-200" htmlFor="auth-password">
                    Password
                  </label>
                  <div className="flex min-h-9 items-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 transition focus-within:border-cyan-200/55">
                    <LockKeyhole className="size-4 text-slate-400" />
                    <input
                      id="auth-password"
                      className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                      name="password"
                      placeholder="Minimum 8 characters"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="grid size-8 place-items-center rounded-[5px] text-slate-300 transition hover:bg-white/8 hover:text-white"
                      onClick={() => setShowPassword((value) => !value)}
                      type="button"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {mode === "signup" ? (
                  <label className="grid gap-2">
                    <span className="font-medium text-slate-200">Referral code</span>
                    <input
                      className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                      name="referralCode"
                      placeholder="Optional tracking code"
                      type="text"
                    />
                  </label>
                ) : null}

                <button
                  className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
                  type="submit"
                >
                  {mode === "signup" ? "Continue to activation" : "Open dashboard"}
                  <ArrowRight className="size-4" />
                </button>
              </form>

              <div className="mt-5 rounded-[5px] border border-cyan-200/15 bg-cyan-300/8 p-3">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-cyan-200" />
                  <div>
                    <p className="font-semibold text-cyan-50">Activation path</p>
                    <p className="mt-1 leading-5 text-slate-300">
                      New accounts remain gated until Paystack verifies the one-time sign-up fee.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {activationSteps.map((step, index) => (
                <div
                  className="flex items-center gap-3 rounded-[5px] border border-white/10 bg-white/[0.045] px-3 py-3 text-slate-300 backdrop-blur"
                  key={step}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-[5px] bg-cyan-300/12 font-semibold text-cyan-100">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <ByteEarnLogo className="size-10 shrink-0" />
      <div>
        <p className="text-base font-semibold leading-none">byte-earn</p>
        <p className="text-slate-300">Creator earning network</p>
      </div>
    </div>
  );
}
