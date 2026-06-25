import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';
import Suit from '../components/Suit.jsx';
import FriendButton from '../components/FriendButton.jsx';

// Diretório social do clube: encontre jogadores, veja pedidos de amizade
// recebidos e gerencie suas conexões.
export default function Players() {
  const { player } = useAuth();
  const [players, setPlayers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rels, setRels] = useState({}); // playerId -> relationship
  const [q, setQ] = useState('');

  function loadSocial() {
    if (!player) return;
    api.get('/friends/requests').then(setRequests).catch(() => {});
    api.get('/friends').then((friends) => {
      const map = {};
      friends.forEach((f) => (map[f.id] = 'friends'));
      setRels((r) => ({ ...r, ...map }));
    });
  }

  useEffect(() => {
    api.get('/players').then(setPlayers).catch(() => {});
    loadSocial();
  }, [player]);

  // Busca status individual para jogadores ainda não mapeados (sob demanda).
  useEffect(() => {
    if (!player) return;
    const unknown = players.filter((p) => p.id !== player.id && rels[p.id] === undefined);
    unknown.slice(0, 50).forEach((p) => {
      api.get(`/friends/status/${p.id}`).then(({ status }) =>
        setRels((r) => ({ ...r, [p.id]: status }))
      );
    });
  }, [players, player]);

  function setRel(id, status) {
    setRels((r) => ({ ...r, [id]: status }));
    loadSocial();
  }

  const filtered = players.filter((p) => {
    const t = `${p.name} ${p.nickname || ''}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Jogadores</h1>
        <p className="text-sm text-zinc-400">Conheça o clube e faça amizades.</p>
      </div>

      {/* Pedidos de amizade recebidos */}
      {player && requests.length > 0 && (
        <section className="card p-5">
          <h2 className="font-display font-semibold mb-3">
            Pedidos de amizade <span className="chip ml-1">{requests.length}</span>
          </h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <Avatar player={r} size={40} rounded="rounded-full" />
                <Link to={`/jogador/${r.id}`} className="flex-1 font-medium hover:text-purple-light">
                  {r.name}
                  {r.nickname && <span className="text-zinc-500"> “{r.nickname}”</span>}
                </Link>
                <FriendButton
                  playerId={r.id}
                  relationship="incoming"
                  size="sm"
                  onChange={(s) => setRel(r.id, s)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <input
        className="input max-w-sm"
        placeholder="Buscar jogador…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="card p-4 flex items-center gap-3">
            <Link to={`/jogador/${p.id}`}>
              <Avatar player={p} size={52} rounded="rounded-xl" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/jogador/${p.id}`} className="font-medium hover:text-purple-light flex items-center gap-1">
                <span style={{ color: p.color }}><Suit suit={p.suit} /></span>
                <span className="truncate">{p.name}</span>
                {p.vip && <span className="text-yellow-300 text-xs" title="VIP">★</span>}
              </Link>
              {p.nickname && <div className="text-xs text-zinc-500 truncate">“{p.nickname}”</div>}
              {player && p.id !== player.id && (
                <div className="mt-2">
                  <FriendButton
                    playerId={p.id}
                    relationship={rels[p.id] ?? 'none'}
                    size="sm"
                    onChange={(s) => setRel(p.id, s)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
