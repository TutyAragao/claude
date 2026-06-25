export default function StatTile({ label, value, hint, accent }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className="font-display text-2xl font-bold mt-1"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );
}
