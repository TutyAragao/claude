import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { money, dateText } from '../format.js';
import NextTournament from '../components/NextTournament.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Lobby() {
  const { player } = useAuth();
  const [next, setNext] = useState(null);
  const [list, setList] = useState([]);
  const [scope, setScope] = useState('all'); // all | mine

  function load() {
    api.get('/tournaments/next').then(setNext).catch(() => {});
    const q = scope === 'mine' ? '?mine=1' : '';
    api.get(`/tournaments${q}`).then(setList).catch(() => {});
  }
  useEffect(load, [scope]);

  const finished = list.filter((t) => t.status === 'finished');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Lobby de torneios" subtitle="Próximo evento e histórico do clube." />
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

      {next ? (
        <NextTournament tournament={next} />
      ) : (
        <div className="card p-8 text-center text-zinc-500">
          Nenhum torneio agendado no momento.
        </div>
      )}

      <section>
        <h3 className="font-display text-lg font-semibold mb-3">Torneios realizados</h3>
        {finished.length === 0 ? (
          <div className="card p-8 text-center text-zinc-500">Nenhum torneio realizado ainda.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {finished.map((t) => (
              <div key={t.id} className="card lift p-4">
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
