import { LockKeyhole } from "lucide-react";
import { signInAction } from "@/app/auth/actions";
import { ByteEarnLogo } from "@/components/brand/byte-earn-logo";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#08101d] px-4 py-8 text-[11px] text-white">
      <section className="w-full max-w-md rounded-[5px] border border-white/10 bg-[#0d182b] p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <ByteEarnLogo className="size-11 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-none">byte-earn admin</p>
            <p className="text-slate-300">Restricted console access</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-cyan-100">
          <LockKeyhole className="size-4" />
          <p className="font-semibold">Admin sign-in</p>
        </div>

        <form action={signInAction} className="mt-5 grid gap-3">
          <input name="errorRedirectTo" type="hidden" value="/admin-login" />

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Email</span>
            <input
              className="min-h-10 rounded-[5px] border border-white/10 bg-white/[0.055] px-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              name="email"
              placeholder="admin@example.com"
              required
              type="email"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Password</span>
            <input
              className="min-h-10 rounded-[5px] border border-white/10 bg-white/[0.055] px-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
              name="password"
              placeholder="Enter your password"
              required
              type="password"
            />
          </label>

          <button
            className="mt-1 inline-flex min-h-11 items-center justify-center rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
