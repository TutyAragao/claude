// Catálogo de avatares-personagem do clube. O backend guarda só a `key`;
// o visual (emoji + nome) vive aqui no front.
export const AVATARS = [
  { key: 'macaco-mafioso', emoji: '🐵', name: 'Macaco Mafioso' },
  { key: 'tubarao', emoji: '🦈', name: 'Tubarão' },
  { key: 'lobo', emoji: '🐺', name: 'Lobo Solitário' },
  { key: 'raposa', emoji: '🦊', name: 'Raposa Esperta' },
  { key: 'coringa', emoji: '🃏', name: 'Coringa' },
  { key: 'caveira', emoji: '💀', name: 'Caveira' },
  { key: 'rei', emoji: '👑', name: 'Rei' },
  { key: 'tigre', emoji: '🐯', name: 'Tigre' },
  { key: 'aguia', emoji: '🦅', name: 'Águia' },
  { key: 'dragao', emoji: '🐲', name: 'Dragão' },
  { key: 'urso', emoji: '🐻', name: 'Urso' },
  { key: 'cobra', emoji: '🐍', name: 'Cobra' },
  { key: 'diabo', emoji: '😈', name: 'Diabinho' },
  { key: 'fantasma', emoji: '👻', name: 'Fantasma' },
  { key: 'alien', emoji: '👽', name: 'Alien' },
  { key: 'robo', emoji: '🤖', name: 'Robô' },
  { key: 'cowboy', emoji: '🤠', name: 'Cowboy' },
  { key: 'palhaco', emoji: '🤡', name: 'Palhaço' },
  { key: 'ninja', emoji: '🥷', name: 'Ninja' },
  { key: 'gato', emoji: '🐱', name: 'Gato' },
];

const BY_KEY = Object.fromEntries(AVATARS.map((a) => [a.key, a]));

export function getAvatar(key) {
  return key ? BY_KEY[key] || null : null;
}
