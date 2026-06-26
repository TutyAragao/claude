import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'river-club-dev-secret-change-me';
const TOKEN_TTL = '30d';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(player) {
  return jwt.sign(
    { id: player.id, role: player.role, name: player.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Middleware: exige autenticação. Popula req.user a partir do Bearer token.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Middleware: exige papel de organizador.
export function requireOrganizer(req, res, next) {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Acesso restrito ao organizador' });
  }
  next();
}

// Tenta autenticar mas não bloqueia (rotas públicas com extras para logados).
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      /* ignora token inválido */
    }
  }
  next();
}
