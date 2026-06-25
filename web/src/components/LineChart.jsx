// Mini gráfico de linha/área em SVG (sem dependências). Temável pelo acento.
// points: [{ label, value }]. Precisa de ao menos 2 pontos.
export default function LineChart({ points, height = 140 }) {
  if (!points || points.length < 2) return null;

  const W = 320;
  const H = height;
  const padX = 10;
  const padTop = 12;
  const padBottom = 22;

  const values = points.map((p) => p.value);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  const x = (i) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v) => padTop + (1 - (v - minV) / range) * (H - padTop - padBottom);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${(H - padBottom).toFixed(1)} L ${x(0).toFixed(1)} ${(H - padBottom).toFixed(1)} Z`;

  const accent = 'rgb(var(--accent-light))';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* linha base */}
      <line x1={padX} x2={W - padX} y1={H - padBottom} y2={H - padBottom}
        stroke="currentColor" strokeOpacity="0.12" />

      <path d={area} fill="url(#lc-fill)" />
      <path d={line} fill="none" stroke={accent} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2.5}
            fill={accent} stroke="rgb(var(--bg))" strokeWidth="1.5" />
        </g>
      ))}

      {/* rótulo do último valor */}
      <text x={x(points.length - 1)} y={y(values[values.length - 1]) - 8}
        textAnchor="end" fontSize="11" fill="currentColor" fontWeight="700">
        {values[values.length - 1]}
      </text>
    </svg>
  );
}
