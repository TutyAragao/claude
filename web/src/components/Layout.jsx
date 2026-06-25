import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <NavLink to="/" className="font-display text-lg font-bold flex items-center gap-2">
            <span className="text-purple-light">♠</span>
            River <span className="text-purple-light">Club</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
            {isOrganizer && <NavItem to="/painel" label="Painel" />}
          </nav>

          <div className="flex items-center gap-2">
            {player ? (
              <>
                <NavLink
                  to={`/jogador/${player.id}`}
                  className="hidden sm:block text-sm text-zinc-300 hover:text-white"
                >
                  {player.name}
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
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-zinc-600">
        ♠ ♥ ♦ ♣ River Club — gestão de home game presencial
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
        `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          isActive ? 'bg-purple/20 text-purple-light' : 'text-zinc-400 hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
