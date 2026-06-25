import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';
import { money, chips, relativeTime } from '../format.js';

// Feed de atividades do clube: quem ganhou, novos recordes e novas amizades.
export default function Feed() {
  const { player } = useAuth();
  const [scope, setScope] = useState('all');
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    api.get(`/activities?scope=${scope}`).then(setItems).catch(() => setItems([]));
  }, [scope]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Feed do clube</h1>
          <p className="text-sm text-zinc-400">Quem ganhou, novos recordes e amizades.</p>
        </div>
        {player && (
          <div className="flex rounded-xl bg-black/40 p-1 text-sm">
            {[
              ['all', 'Tudo'],
              ['friends', 'Amigos'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setScope(k)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  scope === k ? 'bg-purple text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {items === null ? (
        <p className="text-zinc-500">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">
          {scope === 'friends'
            ? 'Seus amigos ainda não fizeram nada por aqui. Adicione mais gente!'
            : 'Nada por aqui ainda. Os destaques aparecem quando rolam torneios.'}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <ActivityItem key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}

const META = {
  win: { icon: '🏆', accent: '#F1C40F' },
  first_win: { icon: '🌟', accent: '#9D4EDD' },
  record_prize: { icon: '💰', accent: '#2ECC71' },
  record_points: { icon: '🔥', accent: '#FF7F50' },
  record_stack: { icon: '🪙', accent: '#F1C40F' },
  friendship: { icon: '🤝', accent: '#3FA7FF' },
};

function ActivityItem({ e }) {
  const meta = META[e.type] || { icon: '•', accent: '#9D4EDD' };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl grid place-items-center text-lg shrink-0"
        style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}55` }}
      >
        {meta.icon}
      </div>
      <Avatar player={e.actor} size={40} rounded="rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <Body e={e} />
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{relativeTime(e.date)}</p>
      </div>
      {e.other && (
        <Link to={`/jogador/${e.other.id}`}>
          <Avatar player={e.other} size={40} rounded="rounded-full" />
        </Link>
      )}
    </div>
  );
}

function PlayerLink({ p }) {
  return (
    <Link to={`/jogador/${p.id}`} className="font-medium hover:text-purple-light">
      {p.name}
    </Link>
  );
}

function Tournament({ t }) {
  return <span className="text-zinc-300">{t?.name}</span>;
}

function Body({ e }) {
  switch (e.type) {
    case 'win':
      return (
        <>
          <PlayerLink p={e.actor} /> venceu o <Tournament t={e.tournament} /> 🏆
        </>
      );
    case 'first_win':
      return (
        <>
          <PlayerLink p={e.actor} /> conquistou a <span className="text-purple-light">primeira vitória</span> no{' '}
          <Tournament t={e.tournament} />!
        </>
      );
    case 'record_prize':
      return (
        <>
          <PlayerLink p={e.actor} /> fez o <span className="text-green-300">maior prêmio do clube</span>:{' '}
          <span className="font-semibold">{money(e.amount)}</span> no <Tournament t={e.tournament} />
        </>
      );
    case 'record_points':
      return (
        <>
          <PlayerLink p={e.actor} /> cravou o <span className="text-orange-300">recorde de pontos</span> num torneio:{' '}
          <span className="font-semibold">{e.amount} pts</span> no <Tournament t={e.tournament} />
        </>
      );
    case 'record_stack':
      return (
        <>
          <PlayerLink p={e.actor} /> cravou o <span className="text-yellow-300">maior stack final</span> do clube:{' '}
          <span className="font-semibold">{chips(e.amount)}</span> no <Tournament t={e.tournament} />
        </>
      );
    case 'friendship':
      return (
        <>
          <PlayerLink p={e.actor} /> e <PlayerLink p={e.other} /> agora são <span className="text-blue-300">amigos</span>
        </>
      );
    default:
      return null;
  }
}
