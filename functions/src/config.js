// Parâmetros do clube.
export const SEATS_PER_TABLE = 9; // por mesa serão 9 pessoas
export const SEATS_MIN = 18; // mínimo: 2 mesas
export const SEATS_MAX = 40; // máximo suportado por torneio

// Quantas mesas uma lotação ocupa (a última pode ficar incompleta).
export function tablesFor(seats) {
  if (!seats || seats <= 0) return 0;
  return Math.ceil(seats / SEATS_PER_TABLE);
}
