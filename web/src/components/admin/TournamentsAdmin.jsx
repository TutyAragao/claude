import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { money, dateText } from '../../format.js';

const SEATS_PER_TABLE = 9;
const SEATS_MIN = 18;
const SEATS_MAX = 40;

const BLANK = {
  name: '',
  number: '',
  date: '',
  buy_in: '',
  starting_stack: '',
  blind_structure: '',
  seats: '18',
  vip_opens_at: '',
  opens_at: '',
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
        vip_opens_at: form.vip_opens_at || null,
        opens_at: form.opens_at || null,
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
        <div>
          <label className="label">Estrutura de blinds</label>
          <input className="input" placeholder="20min / nível" value={form.blind_structure} onChange={set('blind_structure')} />
        </div>

        <div>
          <label className="label">
            Vagas — {SEATS_MIN} a {SEATS_MAX} ({SEATS_PER_TABLE} por mesa)
          </label>
          <div className="flex items-center gap-3">
            <input
              className="input"
              type="number"
              min={SEATS_MIN}
              max={SEATS_MAX}
              step="1"
              value={form.seats}
              onChange={set('seats')}
            />
            <span className="text-sm text-zinc-400 whitespace-nowrap">{tablesHint(form.seats)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-3 space-y-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Acesso antecipado VIP (opcional)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Abre p/ VIPs</label>
              <input className="input" type="datetime-local" value={form.vip_opens_at} onChange={set('vip_opens_at')} />
            </div>
            <div>
              <label className="label">Abre p/ todos</label>
              <input className="input" type="datetime-local" value={form.opens_at} onChange={set('opens_at')} />
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            VIPs podem se inscrever entre as duas datas. Sem datas, abre para todos imediatamente.
          </p>
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
                  {t.seats ? ` · ${t.seats} vagas (${tablesHint(t.seats)})` : ' · vagas livres'}
                  {t.vip_opens_at && ' · 🌟 VIP'}
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

function tablesHint(seats) {
  const n = Number(seats);
  if (!n || n <= 0) return 'sem limite';
  const tables = Math.ceil(n / SEATS_PER_TABLE);
  return `${tables} mesa${tables > 1 ? 's' : ''}`;
}
