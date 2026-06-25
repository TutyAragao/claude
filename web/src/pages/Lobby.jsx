import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { money, dateTimeText, dateText } from '../format.js';

export default function Lobby() {
  const { player } = useAuth();
  const [next, setNext] = useState(null);
  const [list, setList] = useState([]);
  const [scope, setScope] = useState('all'); // all | mine
  const [msg, setMsg] = useState('');

  function load() {
    api.get('/tournaments/next').then(setNext).catch(() => {});
    const q = scope === 'mine' ? '?mine=1' : '';
    api.get(`/tournaments${q}`).then(setList).catch(() => {});
  }
  useEffect(load, [scope]);

  async function toggleRegister(t, registered) {
    setMsg('');
    try {
      if (registered) await api.del(`/tournaments/${t.id}/register`);
      else await api.post(`/tournaments/${t.id}/register`);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  const finished = list.filter((t) => t.status === 'finished');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Lobby de torneios</h1>
          <p className="text-sm text-zinc-400">Próximo evento e histórico do clube.</p>
        </div>
        {player && (
          <div className="flex rounded-xl bg-black/40 p-1 text-sm">
            {[
              ['all', 'Todos'],
              ['mine', 'Meus'],
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

      {msg && <p className="text-sm text-red-400">{msg}</p>}

      {next && (
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/20 to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="chip mb-3">♠ Próximo torneio</div>
              <h2 className="font-display text-2xl font-bold">{next.name}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-zinc-300">
                <span>📅 {dateTimeText(next.date)}</span>
                <span>💵 buy-in {money(next.buy_in)}</span>
                {next.starting_stack ? <span>🎰 stack {next.starting_stack.toLocaleString('pt-BR')}</span> : null}
                {next.blind_structure && <span>⏱ {next.blind_structure}</span>}
              </div>
            </div>
            {player && (
              <RegisterButton tournament={next} onToggle={toggleRegister} />
            )}
          </div>
        </div>
      )}

      <section>
        <h3 className="font-display text-lg font-semibold mb-3">Torneios realizados</h3>
        {finished.length === 0 ? (
          <div className="card p-8 text-center text-zinc-500">Nenhum torneio realizado ainda.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {finished.map((t) => (
              <div key={t.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-display font-semibold">{t.name}</div>
                  <div className="text-xs text-zinc-500">{dateText(t.date)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-400">👥 {t.players_count} jogadores</span>
                  <span className="text-zinc-300">{money(t.prize_pool)} em prêmios</span>
                </div>
                {t.champion && (
                  <div className="mt-2 text-sm">
                    <span className="text-zinc-500">🏆 Campeão: </span>
                    <span className="font-medium text-purple-light">{t.champion}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RegisterButton({ tournament, onToggle }) {
  // Sem detalhe de inscrição própria na lista; consulta rápida do detalhe.
  const { player } = useAuth();
  const [registered, setRegistered] = useState(null);

  useEffect(() => {
    api.get(`/tournaments/${tournament.id}`).then((d) => {
      setRegistered(d.registrations.some((r) => r.id === player.id));
    });
  }, [tournament.id, player.id]);

  if (registered === null) return null;
  return (
    <button
      className={registered ? 'btn-ghost' : 'btn-primary'}
      onClick={() => onToggle(tournament, registered).then(() => setRegistered(!registered))}
    >
      {registered ? 'Cancelar inscrição' : 'Inscrever-se'}
    </button>
  );
}
