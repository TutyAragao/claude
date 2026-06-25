import { getAvatar } from '../avatars.js';

// Avatar do jogador: imagem personalizada > avatar-personagem (emoji) > iniciais.
// `size` em pixels; usado tanto no card grande quanto em listas pequenas.
export default function Avatar({ player, size = 40, rounded = 'rounded-xl', className = '' }) {
  const color = player.color || '#9D4EDD';
  const box = { width: size, height: size };
  const border = `2px solid ${color}`;

  if (player.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt={player.name}
        className={`${rounded} object-cover ${className}`}
        style={{ ...box, border }}
      />
    );
  }

  const preset = getAvatar(player.avatar);
  if (preset) {
    return (
      <div
        className={`${rounded} grid place-items-center ${className}`}
        title={preset.name}
        style={{ ...box, background: `${color}22`, border, fontSize: size * 0.52 }}
      >
        {preset.emoji}
      </div>
    );
  }

  const initials = (player.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={`${rounded} grid place-items-center font-display font-bold ${className}`}
      style={{ ...box, background: `${color}22`, color, border, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}
