export default function AdminLoading() {
  return (
    <div className="grid gap-4">
      <section className="glass-strong h-28 animate-pulse p-4" />
      <section className="grid gap-3 md:grid-cols-3">
        <div className="glass h-32 animate-pulse p-4" />
        <div className="glass h-32 animate-pulse p-4" />
        <div className="glass h-32 animate-pulse p-4" />
      </section>
    </div>
  );
}
