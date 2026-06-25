// Regras de pontuação do ranking presencial.
// A tabela é configurável por temporada (scoring_table em JSON).
//
// Formato do scoring_table:
// {
//   "positions":   { "1": 100, "2": 80, "3": 65, "4": 50, "5": 30, "6": 30, "7": 30, "8": 30 },
//   "participation": 10,     // pontos por participar (qualquer posição)
//   "bountyPoints":  0       // pontos extras por bounty (expansão)
// }

export const DEFAULT_SCORING = {
  positions: { 1: 100, 2: 80, 3: 65, 4: 50, 5: 30, 6: 30, 7: 30, 8: 30 },
  participation: 10,
  bountyPoints: 0,
};

export function parseScoring(raw) {
  if (!raw) return { ...DEFAULT_SCORING };
  const cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return {
    positions: cfg.positions || {},
    participation: Number(cfg.participation || 0),
    bountyPoints: Number(cfg.bountyPoints || 0),
  };
}

// Pontos de um jogador dado posição e bounties, conforme a tabela da temporada.
export function pointsFor({ position, bounties = 0 }, scoring) {
  const cfg = parseScoring(scoring);
  const positional = Number(cfg.positions[position] ?? 0);
  const participation = Number(cfg.participation || 0);
  const bountyBonus = Number(bounties || 0) * Number(cfg.bountyPoints || 0);
  return positional + participation + bountyBonus;
}
