import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Suit from '../components/Suit.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { money } from '../format.js';

const PERIODS = [
  { key: 'season', label: 'Temporada' },
  { key: 'month', label: 'Mês' },
  { key: 'all', label: 'Histórico' },
];

export default function Ranking() {
  const [period, setPeriod] = useState('season');
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/ranking?period=${period}`)
      .then((d) => setBoard(d.leaderboard))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Ranking presencial"
          subtitle="O diferencial do clube. Pontos somados a cada torneio da temporada."
        />
        <div className="flex rounded-xl bg-black/40 p-1 text-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                period === p.key ? 'bg-purple text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">Carregando…</p>
      ) : board.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">
          Ainda não há resultados nesta visão.
        </div>
      ) : (
        <>
          <Podium top={board.slice(0, 3)} />
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-zinc-500 text-left">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Jogador</th>
                  <th className="px-4 py-3 text-center">J</th>
                  <th className="px-4 py-3 text-center">V</th>
                  <th className="px-4 py-3 text-center">ITM</th>
                  <th className="px-4 py-3 text-right">Prêmios</th>
                  <th className="px-4 py-3 text-right">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {board.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-4 py-3 font-display font-bold text-zinc-400">{r.rank}</td>
                    <td className="px-4 py-3">
                      <Link to={`/jogador/${r.id}`} className="flex items-center gap-2 hover:text-purple-light">
                        <span style={{ color: r.color }} className="text-lg">
                          <Suit suit={r.suit} />
                        </span>
                        <span className="font-medium">{r.name}</span>
                        {r.nickname && <span className="text-zinc-500">“{r.nickname}”</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-400">{r.played}</td>
                    <td className="px-4 py-3 text-center text-zinc-400">{r.wins}</td>
                    <td className="px-4 py-3 text-center text-zinc-400">{r.itm}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{money(r.total_prize)}</td>
                    <td className="px-4 py-3 text-right font-display font-bold text-purple-light">
                      {r.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const MEDALS = ['#F1C40F', '#C0C0C0', '#CD7F32']; // ouro, prata, bronze

function Podium({ top }) {
  if (top.length < 3) return null;
  // ordem visual: 2º, 1º, 3º
  const order = [top[1], top[0], top[2]];
  const heights = ['h-24', 'h-32', 'h-20'];
  return (
    <div className="grid grid-cols-3 gap-3 items-end">
      {order.map((p, i) => {
        const place = p.rank;
        return (
          <Link
            to={`/jogador/${p.id}`}
            key={p.id}
            className="card lift p-4 text-center flex flex-col items-center justify-end"
          >
            <div
              className="w-14 h-14 rounded-full grid place-items-center text-xl font-display font-bold mb-2"
              style={{ background: `${p.color}22`, color: p.color, border: `2px solid ${MEDALS[place - 1]}` }}
            >
              <Suit suit={p.suit} />
            </div>
            <div className="font-semibold truncate w-full">{p.name}</div>
            {p.nickname && <div className="text-xs text-zinc-500">“{p.nickname}”</div>}
            <div className="font-display text-2xl font-bold mt-2" style={{ color: MEDALS[place - 1] }}>
              {p.points}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">pontos</div>
            <div className={`${heights[i]} w-full mt-3 rounded-t-lg`} style={{ background: `linear-gradient(${MEDALS[place - 1]}55, transparent)` }} />
          </Link>
        );
      })}
    </div>
  );
}
