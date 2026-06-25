import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { money } from '../format.js';
import LaunchResults from '../components/admin/LaunchResults.jsx';
import ScoringEditor from '../components/admin/ScoringEditor.jsx';
import TournamentsAdmin from '../components/admin/TournamentsAdmin.jsx';
import PlayersAdmin from '../components/admin/PlayersAdmin.jsx';
import PageHeader from '../components/PageHeader.jsx';

const TABS = [
  ['overview', 'Visão geral'],
  ['launch', 'Lançar resultado'],
  ['tournaments', 'Torneios'],
  ['scoring', 'Pontuação'],
  ['players', 'Jogadores'],
];

export default function Admin() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel do organizador"
        subtitle="Onde o presencial vira dado e alimenta o ranking e os perfis."
      />

      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar"
        style={{ background: 'rgb(var(--t-100) / 0.04)' }}>
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
              tab === k
                ? 'bg-purple text-white shadow-glow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview onLaunch={() => setTab('launch')} />}
      {tab === 'launch' && <LaunchResults />}
      {tab === 'tournaments' && <TournamentsAdmin />}
      {tab === 'scoring' && <ScoringEditor />}
      {tab === 'players' && <PlayersAdmin />}
    </div>
  );
}

function Overview({ onLaunch }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/admin/overview').then(setData).catch(() => {});
  }, []);
  if (!data) return <p className="text-zinc-500">Carregando…</p>;
  const k = data.kpis;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Jogadores ativos" value={k.activePlayers} />
        <Kpi label="Torneios na temporada" value={k.tournamentsInSeason} />
        <Kpi label="Premiação paga" value={money(k.prizePaid)} />
        <Kpi label="Na mesa do dia" value={k.atTable} />
      </div>
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="font-display font-semibold">Lançar resultado de um torneio</div>
          <div className="text-sm text-zinc-400">
            Monte o ranking final do evento e recalcule pontos e perfis.
          </div>
        </div>
        <button className="btn-primary" onClick={onLaunch}>
          Lançar agora
        </button>
      </div>
      {data.season && (
        <p className="text-xs text-zinc-500">
          Temporada vigente: <span className="text-zinc-300">{data.season.name}</span>
        </p>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="font-display text-2xl font-bold mt-1 text-purple-light">{value}</div>
    </div>
  );
}
