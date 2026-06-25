// Popula o banco com dados de demonstração: 1 organizador, jogadores,
// uma temporada com tabela de pontuação padrão, alguns torneios e resultados.
// Idempotente o suficiente para desenvolvimento: zera as tabelas antes.
import db from './db.js';
import { hashPassword } from './auth.js';
import { DEFAULT_SCORING, pointsFor } from './scoring.js';

const PASSWORD = 'river123';

function reset() {
  db.exec(`
    DELETE FROM results;
    DELETE FROM registrations;
    DELETE FROM tournaments;
    DELETE FROM seasons;
    DELETE FROM players;
    DELETE FROM sqlite_sequence;
  `);
}

function seed() {
  reset();

  const insPlayer = db.prepare(
    `INSERT INTO players (email, password_hash, name, nickname, role, suit, color, phrase, bio)
     VALUES (@email, @hash, @name, @nickname, @role, @suit, @color, @phrase, @bio)`
  );

  const pwd = hashPassword(PASSWORD);
  const players = [
    { email: 'admin@riverclub.gg', name: 'Marina Souza', nickname: 'Dealer', role: 'organizer', suit: 'spade', color: '#9D4EDD', phrase: 'A casa sempre organiza.', bio: 'Organizadora do River Club.' },
    { email: 'arthur@riverclub.gg', name: 'Arthur Lima', nickname: 'River', role: 'player', suit: 'heart', color: '#E5384B', phrase: 'Sempre tem uma última carta.', bio: 'Especialista em virar a mão no river.' },
    { email: 'bia@riverclub.gg', name: 'Beatriz Nunes', nickname: 'Bluff', role: 'player', suit: 'diamond', color: '#3FA7FF', phrase: 'Eu nunca blefo. (blefo)', bio: '' },
    { email: 'caio@riverclub.gg', name: 'Caio Ferreira', nickname: 'All-in', role: 'player', suit: 'club', color: '#2ECC71', phrase: 'Pra que esperar?', bio: '' },
    { email: 'dani@riverclub.gg', name: 'Daniela Rocha', nickname: 'Ice', role: 'player', suit: 'spade', color: '#F1C40F', phrase: 'Sangue frio.', bio: '' },
    { email: 'edu@riverclub.gg', name: 'Eduardo Pires', nickname: 'Chip', role: 'player', suit: 'heart', color: '#FF7F50', phrase: 'Contando fichas.', bio: '' },
  ];
  const ids = players.map((p) =>
    Number(
      insPlayer.run({
        email: p.email, hash: pwd, name: p.name, nickname: p.nickname,
        role: p.role, suit: p.suit, color: p.color, phrase: p.phrase, bio: p.bio,
      }).lastInsertRowid
    )
  );
  const playerIds = ids.slice(1); // sem o organizador nos torneios

  // Temporada vigente
  const seasonId = Number(
    db
      .prepare(
        `INSERT INTO seasons (name, start_date, end_date, status, scoring_table)
         VALUES (?, ?, ?, 'open', ?)`
      )
      .run('Temporada 2026', '2026-01-01', '2026-12-31', JSON.stringify(DEFAULT_SCORING))
      .lastInsertRowid
  );

  const insT = db.prepare(
    `INSERT INTO tournaments (season_id, number, name, modality, date, buy_in, starting_stack, blind_structure, seats, status)
     VALUES (?, ?, ?, 'Texas Hold''em', ?, ?, ?, ?, ?, ?)`
  );
  const insR = db.prepare(
    `INSERT INTO results (tournament_id, player_id, position, prize, points, bounties)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  // Dois torneios finalizados + um agendado
  const finished = [
    { number: 1, name: 'Mini Torneio #1', date: '2026-03-15T20:00:00', buy_in: 50, order: [1, 0, 3, 2, 4], prizes: [300, 180, 90, 0, 0] },
    { number: 2, name: 'Mini Torneio #2', date: '2026-04-19T20:00:00', buy_in: 50, order: [0, 2, 1, 4, 3], prizes: [300, 180, 90, 0, 0] },
  ];

  for (const t of finished) {
    const tid = Number(insT.run(seasonId, t.number, t.name, t.date, t.buy_in, 20000, '20min / nível', null, 'finished').lastInsertRowid);
    t.order.forEach((pi, idx) => {
      const position = idx + 1;
      const prize = t.prizes[idx] || 0;
      const bounties = position === 1 ? 2 : position === 2 ? 1 : 0;
      const points = pointsFor({ position, bounties }, DEFAULT_SCORING);
      insR.run(tid, playerIds[pi], position, prize, points, bounties);
    });
  }

  // Próximo torneio agendado, com inscrições
  const nextId = Number(
    insT.run(seasonId, 3, 'Mini Torneio #3', '2026-07-12T20:00:00', 50, 20000, '20min / nível', 3, 'scheduled').lastInsertRowid
  );
  // 3 vagas, 4 inscritos -> o último entra na lista de espera (demo do recurso)
  const insReg = db.prepare('INSERT INTO registrations (tournament_id, player_id) VALUES (?, ?)');
  for (const pid of playerIds.slice(0, 4)) insReg.run(nextId, pid);

  console.log('✓ Seed concluído.');
  console.log(`  Organizador: admin@riverclub.gg / ${PASSWORD}`);
  console.log(`  Jogador:     arthur@riverclub.gg / ${PASSWORD}`);
}

seed();
