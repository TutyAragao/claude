import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationsBell from './NotificationsBell.jsx';

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/feed', label: 'Feed' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/torneios', label: 'Torneios' },
  { to: '/jogadores', label: 'Jogadores' },
];

export default function Layout({ children }) {
  const { player, isOrganizer, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-ink/70 backdrop-blur-xl"
        style={{ borderColor: 'rgb(var(--border) / 0.08)' }}>
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between gap-4">
          <NavLink to="/" className="group font-display text-lg font-bold flex items-center gap-2 shrink-0">
            <span className="text-purple-light text-xl transition-transform group-hover:rotate-12 group-hover:scale-110">
              ♠
            </span>
            River <span className="text-gradient">Club</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-0.5 rounded-full p-1"
            style={{ background: 'rgb(var(--t-100) / 0.04)' }}>
            {links.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
            {isOrganizer && <NavItem to="/painel" label="Painel" />}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {player ? (
              <>
                <NotificationsBell />
                <NavLink
                  to={`/jogador/${player.id}`}
                  className="hidden sm:block text-sm text-zinc-300 hover:text-white transition"
                >
                  {player.name.split(' ')[0]}
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="btn-ghost text-sm py-1.5 px-3"
                >
                  Sair
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn-primary text-sm py-1.5 px-3">
                Entrar
              </NavLink>
            )}
          </div>
        </div>

        {/* Nav mobile: rolagem horizontal */}
        <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
          {links.map((l) => (
            <NavItem key={l.to} {...l} />
          ))}
          {isOrganizer && <NavItem to="/painel" label="Painel" />}
        </nav>
      </header>

      <main key={location.pathname} className="mx-auto max-w-5xl px-4 py-8 animate-fade-up">
        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-zinc-600">
        <div className="text-base tracking-[0.3em] text-zinc-700 mb-2">♠ ♥ ♦ ♣</div>
        River Club — gestão de home game presencial
      </footer>
    </div>
  );
}

function NavItem({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
          isActive
            ? 'bg-purple text-white shadow-glow'
            : 'text-zinc-400 hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
