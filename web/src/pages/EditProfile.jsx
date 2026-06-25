import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import PlayerCard from '../components/PlayerCard.jsx';
import { SUIT_OPTIONS } from '../components/Suit.jsx';
import { AVATARS } from '../avatars.js';
import { THEMES, applyTheme } from '../themes.js';

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
    theme: player.theme || 'dark',
    avatar: player.avatar || '',
    avatar_url: player.avatar_url || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Preview de tema ao vivo; reverte ao tema salvo se sair sem salvar.
  function previewTheme(key) {
    set('theme', key);
    applyTheme(key);
  }
  useEffect(() => {
    return () => applyTheme(player.theme || 'dark');
  }, [player.theme]);

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
        <Field label="Avatar — escolha um personagem">
          <div className="grid grid-cols-7 gap-2">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a.key}
                title={a.name}
                onClick={() => set('avatar', form.avatar === a.key ? '' : a.key)}
                className={`aspect-square rounded-xl text-xl grid place-items-center border transition ${
                  form.avatar === a.key && !form.avatar_url
                    ? 'border-purple-light bg-purple/20 scale-105'
                    : 'border-white/10 bg-black/40 hover:border-white/30'
                }`}
              >
                {a.emoji}
              </button>
            ))}
          </div>
          {form.avatar && !form.avatar_url && (
            <p className="text-xs text-zinc-500 mt-1.5">
              {AVATARS.find((a) => a.key === form.avatar)?.name}
            </p>
          )}
        </Field>

        <Field label="…ou cole a URL de uma imagem (tem prioridade)">
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

        <Field label="Tema do site">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {THEMES.map((t) => {
              const locked = t.vip && !player.vip;
              const active = form.theme === t.key;
              return (
                <button
                  type="button"
                  key={t.key}
                  disabled={locked}
                  onClick={() => previewTheme(t.key)}
                  className={`relative rounded-xl p-2 border text-left transition ${
                    active ? 'border-purple-light ring-1 ring-purple-light/60' : 'border-white/10 hover:border-white/30'
                  } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title={locked ? 'Exclusivo para VIPs' : t.name}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full border border-white/20"
                      style={{ background: t.bg }}
                    >
                      <span className="block w-2.5 h-2.5 rounded-full m-1" style={{ background: t.accent }} />
                    </span>
                    <span className="text-sm">{t.name}</span>
                  </div>
                  {t.vip && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] text-yellow-300">
                      {locked ? '🔒' : '★'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!player.vip && (
            <p className="text-xs text-zinc-500 mt-1.5">
              Claro e Escuro são gratuitos. Os temas com 🔒 são exclusivos VIP.
            </p>
          )}
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
