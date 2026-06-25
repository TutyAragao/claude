import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import PlayerCard from '../components/PlayerCard.jsx';
import { SUIT_OPTIONS } from '../components/Suit.jsx';

const COLORS = ['#9D4EDD', '#7B2FBF', '#E5384B', '#3FA7FF', '#2ECC71', '#F1C40F', '#FF7F50', '#E84393'];

export default function EditProfile() {
  const { player, setPlayer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: player.name || '',
    nickname: player.nickname || '',
    phrase: player.phrase || '',
    bio: player.bio || '',
    suit: player.suit || 'spade',
    color: player.color || '#9D4EDD',
    avatar_url: player.avatar_url || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await api.put('/players/me', form);
      setPlayer(d.player);
      navigate(`/jogador/${player.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <form onSubmit={save} className="card p-6 space-y-4 order-2 md:order-1">
        <h1 className="font-display text-xl font-bold">Editar perfil</h1>

        <Field label="Nome">
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Apelido de mesa">
          <input
            className="input"
            placeholder="Ex.: River"
            value={form.nickname}
            onChange={(e) => set('nickname', e.target.value)}
          />
        </Field>
        <Field label="Frase de mesa">
          <input
            className="input"
            placeholder="Uma frase para o seu card"
            value={form.phrase}
            onChange={(e) => set('phrase', e.target.value)}
          />
        </Field>
        <Field label="Bio">
          <textarea
            className="input min-h-[80px]"
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
        </Field>
        <Field label="URL do avatar (opcional)">
          <input
            className="input"
            placeholder="https://…"
            value={form.avatar_url}
            onChange={(e) => set('avatar_url', e.target.value)}
          />
        </Field>

        <Field label="Naipe favorito">
          <div className="flex gap-2">
            {SUIT_OPTIONS.map((s) => (
              <button
                type="button"
                key={s.value}
                onClick={() => set('suit', s.value)}
                className={`w-12 h-12 rounded-xl text-2xl border transition ${
                  form.suit === s.value
                    ? 'border-purple-light bg-purple/20'
                    : 'border-white/10 bg-black/40 hover:border-white/30'
                } ${s.red ? 'text-red-400' : 'text-zinc-200'}`}
              >
                {s.symbol}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cor de destaque">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => set('color', c)}
                className={`w-9 h-9 rounded-full border-2 transition ${
                  form.color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        </div>
      </form>

      <div className="order-1 md:order-2 sticky top-24">
        <p className="label">Pré-visualização do card</p>
        <PlayerCard player={{ ...player, ...form }} stats={null} badges={[]} />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
