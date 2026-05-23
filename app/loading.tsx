export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-[11px] text-white">
      <div className="glass grid w-full max-w-sm gap-3 p-4 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border border-cyan-200/20 border-t-cyan-200" />
        <p className="font-semibold text-slate-100">Loading byte-earn</p>
        <p className="text-muted">Preparing the next view.</p>
      </div>
    </main>
  );
}
