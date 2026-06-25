import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Avatar from './Avatar.jsx';
import { relativeTime } from '../format.js';

const ICON = {
  friend_request: '🤝',
  friend_accept: '✅',
  waitlist_promoted: '🎟️',
};

function textOf(n) {
  const who = n.actor?.name || 'Alguém';
  switch (n.type) {
    case 'friend_request':
      return `${who} te enviou um pedido de amizade`;
    case 'friend_accept':
      return `${who} aceitou seu pedido de amizade`;
    case 'waitlist_promoted':
      return `Você subiu da lista de espera${n.tournament ? ` no ${n.tournament.name}` : ''}!`;
    default:
      return n.message || 'Nova notificação';
  }
}

function linkOf(n) {
  switch (n.type) {
    case 'friend_request':
      return '/jogadores';
    case 'friend_accept':
      return n.actor ? `/jogador/${n.actor.id}` : '/jogadores';
    case 'waitlist_promoted':
      return '/torneios';
    default:
      return null;
  }
}

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const ref = useRef(null);

  // Polling leve da contagem de não lidas.
  useEffect(() => {
    let active = true;
    const tick = () =>
      api.get('/notifications/count').then((d) => active && setUnread(d.unread)).catch(() => {});
    tick();
    const id = setInterval(tick, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const d = await api.get('/notifications').catch(() => ({ notifications: [] }));
      setItems(d.notifications);
      if (d.unread > 0) {
        api.post('/notifications/read').then(() => setUnread(0)).catch(() => {});
      }
    }
  }

  function go(n) {
    const to = linkOf(n);
    setOpen(false);
    if (to) navigate(to);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative w-9 h-9 grid place-items-center rounded-lg hover:bg-white/10 transition"
        title="Notificações"
        aria-label="Notificações"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-purple text-white text-[10px] font-bold grid place-items-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] card p-2 shadow-glow z-30">
          <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-zinc-500">
            Notificações
          </div>
          {items === null ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">Nada por aqui ainda.</p>
          ) : (
            <div className="max-h-96 overflow-auto space-y-0.5">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n)}
                  className={`w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-white/5 ${
                    n.read ? '' : 'bg-purple/10'
                  }`}
                >
                  {n.actor ? (
                    <Avatar player={n.actor} size={34} rounded="rounded-full" />
                  ) : (
                    <span className="w-[34px] h-[34px] grid place-items-center text-lg">
                      {ICON[n.type] || '🔔'}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">
                      {ICON[n.type] && n.actor && <span className="mr-1">{ICON[n.type]}</span>}
                      {textOf(n)}
                    </span>
                    <span className="block text-xs text-zinc-500 mt-0.5">
                      {relativeTime(n.created_at)}
                    </span>
                  </span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-purple-light mt-1.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
