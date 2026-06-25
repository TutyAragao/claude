import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { player, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (player) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2 tracking-widest text-purple-light">♠ ♥ ♦ ♣</div>
          <h1 className="font-display text-3xl font-bold">
            River <span className="text-purple-light">Club</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Perfis e ranking dos torneios presenciais
          </p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <div className="flex rounded-xl bg-black/40 p-1 text-sm">
            <Tab active={mode === 'login'} onClick={() => setMode('login')}>
              Entrar
            </Tab>
            <Tab active={mode === 'register'} onClick={() => setMode('register')}>
              Criar conta
            </Tab>
          </div>

          {mode === 'register' && (
            <div>
              <label className="label">Nome</label>
              <input className="input" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div>
            <label className="label">E-mail</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          {mode === 'login' && (
            <p className="text-xs text-center text-zinc-500">
              Demo: <code className="text-zinc-400">admin@riverclub.gg</code> ·{' '}
              <code className="text-zinc-400">river123</code>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 font-medium transition ${
        active ? 'bg-purple text-white' : 'text-zinc-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
