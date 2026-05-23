import { HardHat, ServerCog, Sparkles } from "lucide-react";

export default function UnderConstructionPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 text-[11px] text-white">
      <section className="glass-strong grid w-full max-w-3xl gap-6 p-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="relative grid min-h-[220px] place-items-center overflow-hidden rounded-[5px] border border-white/10 bg-[#07101d]">
          <div className="engineer-mascot relative grid size-32 place-items-center rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 shadow-2xl">
            <HardHat className="size-14 text-cyan-100" />
            <div className="absolute -right-3 -top-3 grid size-10 place-items-center rounded-[5px] border border-white/10 bg-[#12213a]">
              <ServerCog className="size-5 text-cyan-200" />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-cyan-100">
            <Sparkles className="size-4" />
            Platform update
          </div>
          <h1 className="text-[24px] font-semibold leading-tight">Engineers are upgrading the servers.</h1>
          <p className="mt-3 max-w-md leading-5 text-muted">
            User-facing routes are temporarily paused. Admins can switch this screen off from platform controls when maintenance is complete.
          </p>
        </div>
      </section>
    </main>
  );
}
