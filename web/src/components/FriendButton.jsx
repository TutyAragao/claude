import { useState } from 'react';
import { api } from '../api.js';

// Botão de amizade que reflete a relação atual e dispara as ações.
// Props: playerId, relationship ('none'|'outgoing'|'incoming'|'friends'|'self'|null),
//        onChange(newStatus), size ('sm'|'md')
export default function FriendButton({ playerId, relationship, onChange, size = 'md' }) {
  const [busy, setBusy] = useState(false);
  if (relationship === 'self' || relationship == null) return null;

  const cls = size === 'sm' ? 'text-xs py-1 px-2.5' : 'text-sm';

  async function act(fn) {
    setBusy(true);
    try {
      const { status } = await fn();
      onChange?.(status);
    } catch {
      /* silencioso */
    } finally {
      setBusy(false);
    }
  }

  if (relationship === 'friends') {
    return (
      <button
        className={`btn-ghost ${cls} group`}
        disabled={busy}
        onClick={() => act(() => api.del(`/friends/${playerId}`))}
        title="Remover amizade"
      >
        <span className="group-hover:hidden text-green-300">🤝 Amigos</span>
        <span className="hidden group-hover:inline text-red-300">Remover</span>
      </button>
    );
  }

  if (relationship === 'outgoing') {
    return (
      <button
        className={`btn-ghost ${cls}`}
        disabled={busy}
        onClick={() => act(() => api.del(`/friends/${playerId}`))}
        title="Cancelar pedido"
      >
        Pedido enviado ✕
      </button>
    );
  }

  if (relationship === 'incoming') {
    return (
      <span className="inline-flex gap-1.5">
        <button
          className={`btn-primary ${cls}`}
          disabled={busy}
          onClick={() => act(() => api.post(`/friends/respond/${playerId}`, { action: 'accept' }))}
        >
          Aceitar
        </button>
        <button
          className={`btn-ghost ${cls}`}
          disabled={busy}
          onClick={() => act(() => api.post(`/friends/respond/${playerId}`, { action: 'decline' }))}
        >
          Recusar
        </button>
      </span>
    );
  }

  // none
  return (
    <button
      className={`btn-primary ${cls}`}
      disabled={busy}
      onClick={() => act(() => api.post(`/friends/request/${playerId}`))}
    >
      + Adicionar amigo
    </button>
  );
}
