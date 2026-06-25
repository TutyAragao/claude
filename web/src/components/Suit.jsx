const SUITS = {
  spade: { symbol: '♠', label: 'Espadas', red: false },
  heart: { symbol: '♥', label: 'Copas', red: true },
  diamond: { symbol: '♦', label: 'Ouros', red: true },
  club: { symbol: '♣', label: 'Paus', red: false },
};

export const SUIT_OPTIONS = Object.entries(SUITS).map(([value, v]) => ({
  value,
  ...v,
}));

export default function Suit({ suit = 'spade', className = '' }) {
  const s = SUITS[suit] || SUITS.spade;
  return (
    <span className={className} title={s.label} aria-label={s.label}>
      {s.symbol}
    </span>
  );
}

export function suitSymbol(suit) {
  return (SUITS[suit] || SUITS.spade).symbol;
}
