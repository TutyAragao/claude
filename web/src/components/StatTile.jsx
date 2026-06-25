export default function StatTile({ label, value, hint, accent }) {
  return (
    <div className="card p-4 relative overflow-hidden group transition duration-200 hover:-translate-y-0.5">
      <span
        className="absolute left-0 top-0 bottom-0 w-1 opacity-70 group-hover:opacity-100 transition"
        style={{ background: accent || 'rgb(var(--accent))' }}
      />
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className="font-display text-2xl font-bold mt-1 tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );
}
