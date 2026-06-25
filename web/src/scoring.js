// Espelha server/src/scoring.js para calcular pontos no cliente (preview ao vivo
// no lançamento de resultados). A fonte da verdade continua sendo o backend.
export function pointsFor(position, bounties, scoring) {
  if (!scoring) return 0;
  const positional = Number(scoring.positions?.[position] ?? 0);
  const participation = Number(scoring.participation || 0);
  const bountyBonus = Number(bounties || 0) * Number(scoring.bountyPoints || 0);
  return positional + participation + bountyBonus;
}
