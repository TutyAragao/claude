import LineChart from './LineChart.jsx';
import { dateText } from '../format.js';

// Evolução de pontos do jogador ao longo dos torneios (acumulado).
// Deriva do histórico já carregado no perfil — sem chamada extra.
export default function PointsChart({ history }) {
  if (!history || history.length < 2) return null;

  // histórico vem do mais recente ao mais antigo; invertemos e acumulamos.
  const asc = [...history].reverse();
  let cum = 0;
  const series = asc.map((h) => ({ label: h.name, value: (cum += h.points) }));

  const first = asc[0];
  const last = asc[asc.length - 1];

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Evolução de pontos</h2>
        <span className="text-xs text-zinc-500">
          {series.length} torneios · {cum} pts no total
        </span>
      </div>
      <div className="text-purple-light">
        <LineChart points={series} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>{dateText(first.date)}</span>
        <span>{dateText(last.date)}</span>
      </div>
    </section>
  );
}
