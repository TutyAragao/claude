import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { money } from '../../format.js';
import { pointsFor } from '../../scoring.js';

// Fluxo central (pós-jogo): o organizador monta o ranking final do torneio em
// ordem (1º, 2º, 3º…). Os pontos são calculados pela tabela da temporada e
// podem ser ajustados manualmente antes de salvar. Ao salvar, ranking e perfis
// são recalculados.
export default function LaunchResults() {
  const [tournaments, setTournaments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [tid, setTid] = useState('');
  const [scoring, setScoring] = useState(null);
  // ranking row: { player_id, name, prize, bounties, points, pointsEdited }
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
          }))
        );
      }
    });
  }, [tid]);

  // Recalcula pontos automáticos (posição/bounties) para linhas não editadas.
  function withAutoPoints(rows, table = scoring) {
    return rows.map((r, i) =>
      r.pointsEdited ? r : { ...r, points: pointsFor(i + 1, Number(r.bounties) || 0, table) }
    );
  }

  // Quando a tabela de pontuação carrega, aplica os pontos automáticos.
  useEffect(() => {
    setRanking((rows) => withAutoPoints(rows, scoring));
  }, [scoring]);

  const chosenIds = new Set(ranking.map((r) => r.player_id));
  const available = players.filter((p) => !chosenIds.has(p.id) && p.active);

  function addPlayer(p) {
    setRanking((r) =>
      withAutoPoints([
        ...r,
        { player_id: p.id, name: p.name, prize: 0, bounties: 0, points: 0, pointsEdited: false },
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
  // Edição manual de pontos: trava a linha para não ser recalculada.
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
          {/* Ranking final (ordenado) */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold">Ranking final</h3>
              <span className="text-sm text-zinc-400">
                {totalPoints} pts · {money(totalPrize)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Pontos calculados pela posição (tabela da temporada). Edite o campo de
              pontos para ajustar manualmente.
              {anyEdited && (
                <button onClick={recalcAll} className="ml-2 text-purple-light hover:underline">
                  recalcular automático
                </button>
              )}
            </p>

            {ranking.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Adicione jogadores na ordem da eliminação (último eliminado = campeão).
              </p>
            ) : (
              <>
                <div className="hidden sm:flex items-center gap-2 px-2 pb-1 text-[10px] uppercase tracking-wide text-zinc-500">
                  <span className="w-8 text-center">Pos</span>
                  <span className="flex-1">Jogador</span>
                  <span className="w-24 text-center">Prêmio</span>
                  <span className="w-16 text-center">KO</span>
                  <span className="w-20 text-center">Pontos</span>
                  <span className="w-14" />
                </div>
                <div className="space-y-2">
                  {ranking.map((r, i) => (
                    <div key={r.player_id} className="flex items-center gap-2 rounded-xl bg-black/30 p-2">
                      <span className="w-8 text-center font-display font-bold text-purple-light">
                        {i + 1}º
                      </span>
                      <span className="flex-1 font-medium truncate">{r.name}</span>
                      <input
                        className="input w-24 py-1.5 text-sm"
                        type="number"
                        min="0"
                        placeholder="Prêmio"
                        value={r.prize}
                        onChange={(e) => setField(i, 'prize', e.target.value)}
                      />
                      <input
                        className="input w-16 py-1.5 text-sm"
                        type="number"
                        min="0"
                        placeholder="KO"
                        title="Bounties"
                        value={r.bounties}
                        onChange={(e) => setField(i, 'bounties', e.target.value)}
                      />
                      <div className="relative w-20">
                        <input
                          className={`input w-20 py-1.5 text-sm text-center font-display ${
                            r.pointsEdited ? 'ring-1 ring-purple-light/60' : ''
                          }`}
                          type="number"
                          title={r.pointsEdited ? 'Pontos ajustados manualmente' : 'Pontos automáticos'}
                          value={r.points}
                          onChange={(e) => setPoints(i, e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col">
                        <button className="text-zinc-500 hover:text-white px-1" onClick={() => move(i, -1)}>
                          ▲
                        </button>
                        <button className="text-zinc-500 hover:text-white px-1" onClick={() => move(i, 1)}>
                          ▼
                        </button>
                      </div>
                      <button className="text-red-400/70 hover:text-red-400 px-2" onClick={() => remove(i)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {msg && (
              <p className={`text-sm mt-4 ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                {msg.text}
              </p>
            )}

            <button
              className="btn-primary mt-4"
              disabled={busy || ranking.length === 0}
              onClick={submit}
            >
              {busy ? 'Salvando…' : 'Salvar e atualizar ranking'}
            </button>
          </div>

          {/* Pool de jogadores */}
          <div className="card p-5">
            <h3 className="font-display font-semibold mb-3">Adicionar jogador</h3>
            {available.length === 0 ? (
              <p className="text-sm text-zinc-500">Todos os jogadores já estão no ranking.</p>
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
