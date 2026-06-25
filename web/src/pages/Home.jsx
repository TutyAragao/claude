import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import PlayerCard from '../components/PlayerCard.jsx';
import StatTile from '../components/StatTile.jsx';
import { money, roiText, dateText } from '../format.js';

export default function Home() {
  const { player } = useAuth();
  const [data, setData] = useState(null);
  const [nextT, setNextT] = useState(null);

  useEffect(() => {
    if (!player) return;
    api.get(`/players/${player.id}`).then(setData).catch(() => {});
    api.get('/tournaments/next').then(setNextT).catch(() => {});
  }, [player]);

  if (!data) return <p className="text-zinc-500">Carregando perfil…</p>;
  const { stats, badges, history } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="shrink-0 mx-auto md:mx-0">
          <PlayerCard player={data.player} stats={stats} badges={badges} />
          <Link to="/perfil/editar" className="btn-ghost w-full mt-3 text-sm">
            Personalizar perfil
          </Link>
        </div>

        <div className="flex-1 w-full space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">
              Olá, {data.player.name.split(' ')[0]} 👋
            </h1>
            <p className="text-zinc-400 text-sm">
              {stats.rankPosition
                ? `Você está em ${ordinal(stats.rankPosition)} no ranking da temporada.`
                : 'Jogue um torneio para entrar no ranking da temporada.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Pontos" value={stats.points} accent={data.player.color} />
            <StatTile label="Ranking" value={stats.rankPosition ? `#${stats.rankPosition}` : '—'} />
            <StatTile label="Torneios" value={stats.played} />
            <StatTile label="Vitórias" value={stats.wins} />
            <StatTile label="ITM" value={stats.itm} hint={`${(stats.itmRate * 100).toFixed(0)}% dos jogos`} />
            <StatTile label="ROI" value={roiText(stats.roi)} />
            <StatTile label="Maior prêmio" value={money(stats.maxPrize)} />
            <StatTile label="Pos. média" value={stats.avgPosition ? stats.avgPosition.toFixed(1) : '—'} />
          </div>

          {nextT && (
            <div className="card p-5 flex items-center justify-between gap-4">
              <div>
                <div className="chip mb-2">Próximo torneio</div>
                <div className="font-display text-lg font-semibold">{nextT.name}</div>
                <div className="text-sm text-zinc-400">
                  {dateText(nextT.date)} · buy-in {money(nextT.buy_in)}
                </div>
              </div>
              <Link to="/torneios" className="btn-primary text-sm">
                Ver lobby
              </Link>
            </div>
          )}
        </div>
      </div>

      {history?.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Histórico de torneios</h2>
          <div className="card divide-y divide-white/5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-zinc-500">{dateText(h.date)}</div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-zinc-400">
                    {ordinal(h.position)} lugar
                  </span>
                  <span className="text-zinc-300">{money(h.prize)}</span>
                  <span className="font-display font-semibold text-purple-light">
                    +{h.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ordinal(n) {
  return `${n}º`;
}
