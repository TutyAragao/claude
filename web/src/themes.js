// Catálogo de temas. Claro e Escuro são gratuitos; os demais são exclusivos VIP.
export const THEMES = [
  { key: 'dark', name: 'Escuro', vip: false, bg: '#0A0A0A', accent: '#9D4EDD' },
  { key: 'light', name: 'Claro', vip: false, bg: '#F4F5F8', accent: '#7B2FBF' },
  { key: 'neon', name: 'Neon', vip: true, bg: '#0A0A0A', accent: '#4ADE80' },
  { key: 'crimson', name: 'Carmesim', vip: true, bg: '#0A0A0A', accent: '#F04150' },
  { key: 'ouro', name: 'Ouro', vip: true, bg: '#0A0A0A', accent: '#F1C40F' },
  { key: 'oceano', name: 'Oceano', vip: true, bg: '#0A0A0A', accent: '#3FA7FF' },
  { key: 'roxo', name: 'Roxo Real', vip: true, bg: '#0A0A0A', accent: '#C084FC' },
];

export const FREE_THEMES = THEMES.filter((t) => !t.vip).map((t) => t.key);

const VALID = new Set(THEMES.map((t) => t.key));

// Aplica o tema no <html>. Tema inválido cai no escuro.
export function applyTheme(key) {
  const theme = VALID.has(key) ? key : 'dark';
  document.documentElement.dataset.theme = theme;
}
