import { useEffect, useState } from 'react';
import { api } from '../../api.js';

// Gerenciar jogadores: cadastrar, ativar/desativar, promover a organizador.
export default function PlayersAdmin() {
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', vip: false });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/players').then(setPlayers).catch(() => {});
  }
  useEffect(load, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/admin/players', form);
      setForm({ name: '', email: '', password: '', vip: false });
      setMsg('Jogador cadastrado.');
      load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p) {
    await api.put(`/admin/players/${p.id}`, { active: !p.active });
    load();
  }
  async function toggleRole(p) {
    await api.put(`/admin/players/${p.id}`, {
      role: p.role === 'organizer' ? 'player' : 'organizer',
    });
    load();
  }
  async function toggleVip(p) {
    await api.put(`/admin/players/${p.id}`, { vip: !p.vip });
    load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={create} className="card p-5 space-y-3 h-fit">
        <h3 className="font-display font-semibold">Cadastrar jogador</h3>
        <div>
          <label className="label">Nome</label>
          <input className="input" value={form.name} onChange={set('name')} required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="label">Senha provisória</label>
          <input className="input" value={form.password} onChange={set('password')} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            className="accent-yellow-400"
            checked={form.vip}
            onChange={(e) => setForm((f) => ({ ...f, vip: e.target.checked }))}
          />
          ★ VIP — acesso antecipado às inscrições
        </label>
        {msg && <p className="text-sm text-purple-light">{msg}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? '...' : 'Cadastrar'}
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="font-display font-semibold mb-1">Jogadores do clube</h3>
        {players.map((p) => (
          <div key={p.id} className="card p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">
                {p.name}
                {p.vip && <span className="ml-2 text-yellow-300" title="VIP">★</span>}
                {p.role === 'organizer' && (
                  <span className="ml-2 chip text-[10px] py-0.5">organizador</span>
                )}
              </div>
              <div className="text-xs text-zinc-500 truncate">{p.email}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                className={`text-xs py-1 px-2 rounded-lg ${
                  p.vip ? 'bg-yellow-500/15 text-yellow-300' : 'bg-white/5 text-zinc-400'
                }`}
                onClick={() => toggleVip(p)}
                title="Acesso antecipado a inscrições"
              >
                {p.vip ? '★ VIP' : 'VIP'}
              </button>
              <button className="btn-ghost text-xs py-1 px-2" onClick={() => toggleRole(p)}>
                {p.role === 'organizer' ? '↓ jogador' : '↑ organizador'}
              </button>
              <button
                className={`text-xs py-1 px-2 rounded-lg ${
                  p.active ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                }`}
                onClick={() => toggleActive(p)}
              >
                {p.active ? 'ativo' : 'inativo'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
