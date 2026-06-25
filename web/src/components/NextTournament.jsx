import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import Suit from './Suit.jsx';
import { money, dateTimeText } from '../format.js';

// Painel completo do próximo torneio: dados, vagas, inscrição com lista de
// espera e roster (confirmados + fila), destacando o jogador logado.
export default function NextTournament({ tournament }) {
  const { player } = useAuth();
  const [roster, setRoster] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function load() {
    api.get(`/tournaments/${tournament.id}`).then((d) => setRoster(d.roster));
  }
  useEffect(load, [tournament.id]);

  const me = player && roster ? statusOf(roster, player.id) : { status: 'none' };

  async function register() {
    setBusy(true);
    setMsg(null);
    try {
      const d = await api.post(`/tournaments/${tournament.id}/register`);
      setRoster(d.roster);
      setMsg(
        d.status === 'waitlist'
          ? { type: 'info', text: `Você entrou na lista de espera (posição ${d.queue}).` }
          : { type: 'ok', text: 'Inscrição confirmada!' }
      );
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setMsg(null);
    try {
      const d = await api.del(`/tournaments/${tournament.id}/register`);
      setRoster(d.roster);
      setMsg({ type: 'info', text: 'Inscrição cancelada.' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple/20 to-transparent pointer-events-none" />
      <div className="relative space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="chip mb-3">♠ Próximo torneio</div>
            <h2 className="font-display text-2xl font-bold">{tournament.name}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-zinc-300">
              <span>📅 {dateTimeText(tournament.date)}</span>
              <span>💵 buy-in {money(tournament.buy_in)}</span>
              {tournament.starting_stack ? (
                <span>🎰 stack {tournament.starting_stack.toLocaleString('pt-BR')}</span>
              ) : null}
              {tournament.blind_structure && <span>⏱ {tournament.blind_structure}</span>}
            </div>
          </div>

          {player && roster && (
            <div className="shrink-0 text-right">
              <SeatBadge roster={roster} />
              <div className="mt-2">
                {me.status === 'none' ? (
                  <button className="btn-primary" disabled={busy} onClick={register}>
                    {roster.isFull ? 'Entrar na lista de espera' : 'Inscrever-se'}
                  </button>
                ) : (
                  <button className="btn-ghost" disabled={busy} onClick={cancel}>
                    {me.status === 'waitlist'
                      ? `Sair da espera (${me.queue}º)`
                      : 'Cancelar inscrição'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {msg && (
          <p
            className={`text-sm ${
              msg.type === 'err'
                ? 'text-red-400'
                : msg.type === 'ok'
                ? 'text-green-400'
                : 'text-purple-light'
            }`}
          >
            {msg.text}
          </p>
        )}

        {roster && <Roster roster={roster} meId={player?.id} />}
      </div>
    </div>
  );
}

function statusOf(roster, playerId) {
  if (roster.confirmed.some((p) => p.id === playerId)) return { status: 'confirmed' };
  const w = roster.waitlist.find((p) => p.id === playerId);
  if (w) return { status: 'waitlist', queue: w.queue };
  return { status: 'none' };
}

function SeatBadge({ roster }) {
  if (roster.seats === null) {
    return <span className="chip">{roster.confirmedCount} inscritos · vagas livres</span>;
  }
  return (
    <div className="inline-flex flex-col items-end">
      <span className={`chip ${roster.isFull ? 'text-yellow-300' : 'text-green-300'}`}>
        {roster.confirmedCount}/{roster.seats} vagas
        {roster.isFull && roster.waitlistCount > 0 && ` · ${roster.waitlistCount} na espera`}
      </span>
      <div className="w-40 h-1.5 bg-black/40 rounded-full mt-1.5 overflow-hidden">
        <div
          className="h-full bg-purple-light"
          style={{ width: `${Math.min(100, (roster.confirmedCount / roster.seats) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Roster({ roster, meId }) {
  if (roster.total === 0) {
    return <p className="text-sm text-zinc-500">Ninguém inscrito ainda. Seja o primeiro!</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4 pt-2">
      <RosterList
        title={`Confirmados (${roster.confirmedCount})`}
        players={roster.confirmed}
        meId={meId}
      />
      {roster.waitlistCount > 0 && (
        <RosterList
          title={`Lista de espera (${roster.waitlistCount})`}
          players={roster.waitlist}
          meId={meId}
          waitlist
        />
      )}
    </div>
  );
}

function RosterList({ title, players, meId, waitlist }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{title}</div>
      <div className="space-y-1">
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${
              p.id === meId ? 'bg-purple/20 border border-purple/40' : 'bg-black/20'
            }`}
          >
            <span className="w-6 text-center text-zinc-500 font-display">
              {waitlist ? `${p.queue}º` : i + 1}
            </span>
            <span style={{ color: p.color }}>
              <Suit suit={p.suit} />
            </span>
            <span className="flex-1 truncate">
              {p.name}
              {p.nickname && <span className="text-zinc-500"> “{p.nickname}”</span>}
            </span>
            {p.id === meId && <span className="text-[10px] text-purple-light">você</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
