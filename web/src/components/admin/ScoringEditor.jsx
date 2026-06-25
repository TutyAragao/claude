import { useEffect, useState } from 'react';
import { api } from '../../api.js';

// Configura a tabela de pontuação da temporada vigente.
export default function ScoringEditor() {
  const [season, setSeason] = useState(null);
  const [positions, setPositions] = useState([]); // [{ pos, points }]
  const [participation, setParticipation] = useState(0);
  const [bountyPoints, setBountyPoints] = useState(0);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/seasons/active').then((s) => {
      if (!s) return;
      setSeason(s);
      const st = s.scoring_table || {};
      const entries = Object.entries(st.positions || {})
        .map(([pos, points]) => ({ pos: Number(pos), points: Number(points) }))
        .sort((a, b) => a.pos - b.pos);
      setPositions(entries);
      setParticipation(Number(st.participation || 0));
      setBountyPoints(Number(st.bountyPoints || 0));
    });
  }, []);

  function setRow(i, key, value) {
    setPositions((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: Number(value) } : r)));
  }
  function addRow() {
    const nextPos = positions.length ? Math.max(...positions.map((p) => p.pos)) + 1 : 1;
    setPositions((p) => [...p, { pos: nextPos, points: 0 }]);
  }
  function removeRow(i) {
    setPositions((p) => p.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!season) return;
    setBusy(true);
    setMsg(null);
    try {
      const scoring_table = {
        positions: Object.fromEntries(positions.map((r) => [r.pos, r.points])),
        participation: Number(participation),
        bountyPoints: Number(bountyPoints),
      };
      const updated = await api.put(`/seasons/${season.id}`, { scoring_table });
      setSeason(updated);
      setMsg('Tabela de pontuação salva.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!season)
    return (
      <p className="text-zinc-500">Nenhuma temporada aberta. Crie uma temporada primeiro.</p>
    );

  return (
    <div className="max-w-lg space-y-5">
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="font-display font-semibold">{season.name}</h3>
          <p className="text-sm text-zinc-400">Pontos atribuídos a cada torneio da temporada.</p>
        </div>

        <div className="space-y-2">
          {positions.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-zinc-400 w-24">Posição {r.pos}</span>
              <input
                className="input flex-1 py-1.5"
                type="number"
                value={r.points}
                onChange={(e) => setRow(i, 'points', e.target.value)}
              />
              <span className="text-xs text-zinc-500">pts</span>
              <button className="text-red-400/70 hover:text-red-400 px-2" onClick={() => removeRow(i)}>
                ✕
              </button>
            </div>
          ))}
          <button className="btn-ghost text-sm py-1.5" onClick={addRow}>
            + Adicionar posição
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div>
            <label className="label">Participação</label>
            <input
              className="input py-1.5"
              type="number"
              value={participation}
              onChange={(e) => setParticipation(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Pontos por bounty</label>
            <input
              className="input py-1.5"
              type="number"
              value={bountyPoints}
              onChange={(e) => setBountyPoints(e.target.value)}
            />
          </div>
        </div>

        {msg && <p className="text-sm text-purple-light">{msg}</p>}
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar pontuação'}
        </button>
      </div>
    </div>
  );
}
