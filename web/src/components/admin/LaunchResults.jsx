import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { money } from '../../format.js';
import { pointsFor } from '../../scoring.js';

// Fluxo central (pós-jogo): o organizador registra, por jogador, o stack inicial
// e final, e a colocação. Os pontos vêm da tabela da temporada (ajustáveis à mão).
// Sem cronômetro de blinds — nada é controlado durante o jogo.
export default function LaunchResults() {
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [tid, setTid] = useState('');
  const [scoring, setScoring] = useState(null);
  const [startStack, setStartStack] = useState(0); // stack inicial padrão do torneio
  // row: { player_id, name, prize, bounties, points, pointsEdited, stack_start, stack_end }
  const [ranking, setRanking] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/tournaments').then(setTournaments).catch(() => {});
    api.get('/players').then(setPlayers).catch(() => {});
  }, []);

  // Ao escolher um torneio: carrega inscritos/resultado e a tabela de pontuação.
  useEffect(() => {
    if (!tid) return;
    setMsg(null);
    const t = tournaments.find((x) => String(x.id) === String(tid));
    const defStack = Number(t?.starting_stack || 0);
    setStartStack(defStack);
    const seasonReq = t?.season_id
      ? api.get(`/seasons/${t.season_id}`)
      : api.get('/seasons/active');
    seasonReq.then((s) => setScoring(s?.scoring_table || null)).catch(() => setScoring(null));

    api.get(`/tournaments/${tid}`).then((d) => {
      if (d.results?.length) {
        setRanking(
          d.results.map((r) => ({
            player_id: r.player_id,
            name: r.name,
            prize: r.prize,
            bounties: r.bounties,
            points: r.points,
            pointsEdited: false,
            stack_start: r.stack_start,
            stack_end: r.stack_end,
          }))
        );
      } else {
        setRanking(
          d.registrations.map((p) => ({
            player_id: p.id,
            name: p.name,
            prize: 0,
            bounties: 0,
            points: 0,
            pointsEdited: false,
            stack_start: defStack,
            stack_end: 0,
          }))
        );
      }
    });
  }, [tid]);

  function withAutoPoints(rows, table = scoring) {
    return rows.map((r, i) =>
      r.pointsEdited ? r : { ...r, points: pointsFor(i + 1, Number(r.bounties) || 0, table) }
    );
  }

  useEffect(() => {
    setRanking((rows) => withAutoPoints(rows, scoring));
  }, [scoring]);

  const chosenIds = new Set(ranking.map((r) => r.player_id));
  const available = players.filter((p) => !chosenIds.has(p.id) && p.active);

  function addPlayer(p) {
    setRanking((r) =>
      withAutoPoints([
        ...r,
        { player_id: p.id, name: p.name, prize: 0, bounties: 0, points: 0,
          pointsEdited: false, stack_start: startStack, stack_end: 0 },
      ])
    );
  }
  function remove(i) {
    setRanking((r) => withAutoPoints(r.filter((_, idx) => idx !== i)));
  }
  function move(i, dir) {
    setRanking((r) => {
      const next = [...r];
      const j = i + dir;
      if (j < 0 || j >= next.length) return r;
      [next[i], next[j]] = [next[j], next[i]];
      return withAutoPoints(next);
    });
  }
  function setField(i, key, value) {
    setRanking((r) =>
      withAutoPoints(r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)))
    );
  }
  function setPoints(i, value) {
    setRanking((r) =>
      r.map((row, idx) => (idx === i ? { ...row, points: value, pointsEdited: true } : row))
    );
  }
  function recalcAll() {
    setRanking((r) =>
      r.map((row, i) => ({
        ...row,
        points: pointsFor(i + 1, Number(row.bounties) || 0, scoring),
        pointsEdited: false,
      }))
    );
  }
  // Ordena a classificação pelo stack final (maior primeiro) e recalcula pontos.
  function sortByFinalStack() {
    setRanking((r) =>
      withAutoPoints(
        [...r].sort((a, b) => (Number(b.stack_end) || 0) - (Number(a.stack_end) || 0))
      )
    );
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        results: ranking.map((r, i) => ({
          player_id: r.player_id,
          position: i + 1,
          prize: Number(r.prize) || 0,
          bounties: Number(r.bounties) || 0,
          points: Number(r.points) || 0,
          stack_start: Number(r.stack_start) || 0,
          stack_end: Number(r.stack_end) || 0,
        })),
      };
      await api.post(`/admin/tournaments/${tid}/results`, payload);
      setMsg({ type: 'ok', text: 'Resultado lançado! Ranking e perfis atualizados.' });
      api.get('/tournaments').then(setTournaments);
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const totalPrize = ranking.reduce((s, r) => s + (Number(r.prize) || 0), 0);
  const totalPoints = ranking.reduce((s, r) => s + (Number(r.points) || 0), 0);
  const anyEdited = ranking.some((r) => r.pointsEdited);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <label className="label">Torneio</label>
        <select className="input" value={tid} onChange={(e) => setTid(e.target.value)}>
          <option value="">Selecione um torneio…</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.status === 'finished' ? 'finalizado (reabrir)' : 'agendado'}
            </option>
          ))}
        </select>
      </div>

      {tid && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold">Classificação e stacks</h3>
              <span className="text-sm text-zinc-400">{totalPoints} pts · {money(totalPrize)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mb-3">
              <span>Registre o stack inicial e final de cada jogador.</span>
              {ranking.length > 1 && (
                <button onClick={sortByFinalStack} className="text-purple-light hover:underline">
                  ordenar por stack final ↓
                </button>
              )}
              {anyEdited && (
                <button onClick={recalcAll} className="text-purple-light hover:underline">
                  recalcular pontos
                </button>
              )}
            </div>

            {ranking.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Adicione jogadores (use “ordenar por stack final” para classificar pelo bag).
              </p>
            ) : (
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.player_id} className="rounded-xl bg-black/30 p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-center font-display font-bold text-purple-light">
                        {i + 1}º
                      </span>
                      <span className="flex-1 font-medium truncate">{r.name}</span>
                      <div className="flex flex-col">
                        <button className="text-zinc-500 hover:text-white px-1 leading-none" onClick={() => move(i, -1)}>▲</button>
                        <button className="text-zinc-500 hover:text-white px-1 leading-none" onClick={() => move(i, 1)}>▼</button>
                      </div>
                      <button className="text-red-400/70 hover:text-red-400 px-2" onClick={() => remove(i)}>✕</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 pl-10">
                      <Num label="Stack ini" value={r.stack_start} onChange={(v) => setField(i, 'stack_start', v)} />
                      <Num label="Stack fim" value={r.stack_end} onChange={(v) => setField(i, 'stack_end', v)} />
                      <Num label="Prêmio" value={r.prize} onChange={(v) => setField(i, 'prize', v)} />
                      <Num label="KO" value={r.bounties} onChange={(v) => setField(i, 'bounties', v)} />
                      <Num label="Pontos" value={r.points} onChange={(v) => setPoints(i, v)} highlight={r.pointsEdited} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {msg && (
              <p className={`text-sm mt-4 ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                {msg.text}
              </p>
            )}

            <button className="btn-primary mt-4" disabled={busy || ranking.length === 0} onClick={submit}>
              {busy ? 'Salvando…' : 'Salvar e atualizar ranking'}
            </button>
          </div>

          <div className="card p-5">
            <h3 className="font-display font-semibold mb-3">Adicionar jogador</h3>
            {available.length === 0 ? (
              <p className="text-sm text-zinc-500">Todos os jogadores já estão na lista.</p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-auto">
                {available.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addPlayer(p)}
                    className="w-full text-left rounded-lg px-3 py-2 bg-black/30 hover:bg-purple/20 transition text-sm"
                  >
                    + {p.name}
                    {p.nickname && <span className="text-zinc-500"> “{p.nickname}”</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Num({ label, value, onChange, highlight }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-zinc-500 mb-0.5">{label}</span>
      <input
        className={`input w-full py-1.5 text-sm ${highlight ? 'ring-1 ring-purple-light/60' : ''}`}
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
