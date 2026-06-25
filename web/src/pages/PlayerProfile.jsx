import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import PlayerCard from '../components/PlayerCard.jsx';
import StatTile from '../components/StatTile.jsx';
import { money, roiText, dateText } from '../format.js';

export default function PlayerProfile() {
  const { id } = useParams();
  const { player } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/players/${id}`).then(setData).catch(() => {});
  }, [id]);

  if (!data) return <p className="text-zinc-500">Carregando…</p>;
  const { stats, badges, history } = data;
  const isMe = player && String(player.id) === String(id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="shrink-0 mx-auto md:mx-0">
          <PlayerCard player={data.player} stats={stats} badges={badges} />
          {isMe && (
            <Link to="/perfil/editar" className="btn-ghost w-full mt-3 text-sm">
              Personalizar
            </Link>
          )}
        </div>

        <div className="flex-1 w-full space-y-6">
          {data.player.bio && (
            <p className="text-zinc-300">{data.player.bio}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Ranking" value={stats.rankPosition ? `#${stats.rankPosition}` : '—'} accent={data.player.color} />
            <StatTile label="Pontos" value={stats.points} />
            <StatTile label="Torneios" value={stats.played} />
            <StatTile label="Vitórias" value={stats.wins} />
            <StatTile label="ITM" value={stats.itm} />
            <StatTile label="ROI" value={roiText(stats.roi)} />
            <StatTile label="Maior prêmio" value={money(stats.maxPrize)} />
            <StatTile label="Bounties" value={stats.bounties} />
          </div>
        </div>
      </div>

      {history?.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Histórico</h2>
          <div className="card divide-y divide-white/5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-zinc-500">{dateText(h.date)}</div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-zinc-400">{h.position}º lugar</span>
                  <span className="text-zinc-300">{money(h.prize)}</span>
                  <span className="font-display font-semibold text-purple-light">+{h.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
