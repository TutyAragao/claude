import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { money, dateText } from '../../format.js';

const BLANK = {
  name: '',
  number: '',
  date: '',
  buy_in: '',
  starting_stack: '',
  blind_structure: '',
  seats: '',
};

// Criar e listar torneios.
export default function TournamentsAdmin() {
  const [list, setList] = useState([]);
  const [season, setSeason] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/tournaments').then(setList).catch(() => {});
  }
  useEffect(() => {
    load();
    api.get('/seasons/active').then(setSeason).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/tournaments', {
        name: form.name,
        number: form.number ? Number(form.number) : null,
        date: form.date || null,
        buy_in: form.buy_in ? Number(form.buy_in) : 0,
        starting_stack: form.starting_stack ? Number(form.starting_stack) : 0,
        blind_structure: form.blind_structure || null,
        seats: form.seats ? Number(form.seats) : null,
        season_id: season?.id || null,
        status: 'scheduled',
      });
      setForm(BLANK);
      setMsg('Torneio criado.');
      load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const STATUS = {
    scheduled: { label: 'Agendado', cls: 'text-blue-300' },
    running: { label: 'Em andamento', cls: 'text-yellow-300' },
    finished: { label: 'Finalizado', cls: 'text-zinc-400' },
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={create} className="card p-5 space-y-3 h-fit">
        <h3 className="font-display font-semibold">Novo torneio</h3>
        <div>
          <label className="label">Nome</label>
          <input className="input" placeholder="Mini Torneio #4" value={form.name} onChange={set('name')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Número</label>
            <input className="input" type="number" value={form.number} onChange={set('number')} />
          </div>
          <div>
            <label className="label">Data e hora</label>
            <input className="input" type="datetime-local" value={form.date} onChange={set('date')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Buy-in (R$)</label>
            <input className="input" type="number" value={form.buy_in} onChange={set('buy_in')} />
          </div>
          <div>
            <label className="label">Stack inicial</label>
            <input className="input" type="number" value={form.starting_stack} onChange={set('starting_stack')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Estrutura de blinds</label>
            <input className="input" placeholder="20min / nível" value={form.blind_structure} onChange={set('blind_structure')} />
          </div>
          <div>
            <label className="label">Vagas (lotação)</label>
            <input className="input" type="number" min="0" placeholder="ilimitado" value={form.seats} onChange={set('seats')} />
          </div>
        </div>
        {msg && <p className="text-sm text-purple-light">{msg}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? '...' : 'Criar torneio'}
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="font-display font-semibold mb-1">Torneios</h3>
        {list.map((t) => {
          const s = STATUS[t.status] || STATUS.scheduled;
          return (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-zinc-500">
                  {dateText(t.date)} · buy-in {money(t.buy_in)}
                </div>
              </div>
              <span className={`text-xs font-medium ${s.cls}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
