import Suit from './Suit.jsx';

// Card de jogador compartilhável — estilo carta colecionável.
// Usa a cor de destaque do jogador no avatar e nas bordas.
export default function PlayerCard({ player, stats, badges = [] }) {
  const color = player.color || '#9D4EDD';
  const initials = (player.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="relative w-full max-w-[320px] rounded-3xl p-[2px] shadow-glow"
      style={{ background: `linear-gradient(160deg, ${color}, #1A1A1E 60%)` }}
    >
      <div className="rounded-[22px] bg-ink-soft/95 p-5 h-full flex flex-col gap-4">
        {/* topo: naipe + número da carta */}
        <div className="flex items-center justify-between text-2xl" style={{ color }}>
          <Suit suit={player.suit} />
          <span className="text-xs font-display tracking-widest text-zinc-500">
            RIVER CLUB
          </span>
        </div>

        {/* avatar */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-24 h-24 rounded-2xl grid place-items-center text-3xl font-display font-bold overflow-hidden"
            style={{ background: `${color}22`, color, border: `2px solid ${color}` }}
          >
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="text-center">
            <h3 className="font-display text-lg font-semibold leading-tight">
              {player.name}
              {player.nickname && (
                <span className="text-zinc-400 font-normal"> “{player.nickname}”</span>
              )}
            </h3>
            {player.phrase && (
              <p className="text-xs text-zinc-400 italic mt-1">“{player.phrase}”</p>
            )}
          </div>
        </div>

        {/* estatísticas principais */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Pontos" value={stats.points ?? 0} color={color} />
            <Mini label="Vitórias" value={stats.wins ?? 0} color={color} />
            <Mini label="ITM" value={stats.itm ?? 0} color={color} />
          </div>
        )}

        {/* badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {badges.slice(0, 4).map((b) => (
              <span key={b.key} className="chip" title={b.label}>
                <span>{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value, color }) {
  return (
    <div className="rounded-xl bg-black/40 py-2">
      <div className="font-display text-xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}
