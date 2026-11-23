import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT ?? 3000;
const JWT_SECRET = process.env.JWT_SECRET ?? 'kohi-dev-secret-cambiar-en-produccion';
const JWT_EXPIRES_IN = '1h';
const BCRYPT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!process.env.JWT_SECRET) {
  console.warn('[kohi] JWT_SECRET no definido: usando secreto de desarrollo.');
}

const db = new Database(path.join(__dirname, 'kohi.db'));
db.pragma('journal_mode = WAL');

const stmts = {
  findByEmail: db.prepare('SELECT * FROM waitlist WHERE email = ?'),
  findById: db.prepare('SELECT name, email, position FROM waitlist WHERE id = ?'),
  nextPosition: db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM waitlist'),
  insert: db.prepare(
    'INSERT INTO waitlist (name, email, password_hash, position) VALUES (?, ?, ?, ?)'
  ),
  total: db.prepare('SELECT COUNT(*) AS total FROM waitlist'),
};

// Transacción: calcular la posición e insertar de forma atómica
const registerUser = db.transaction((name, email, passwordHash) => {
  const { next } = stmts.nextPosition.get();
  stmts.insert.run(name, email, passwordHash, next);
  return next;
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const authenticate = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

app.post('/api/register', async (req, res) => {
  const name = req.body?.name?.trim();
  const email = req.body?.email?.trim().toLowerCase();
  const password = req.body?.password;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email y password son obligatorios' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'El password debe tener al menos 8 caracteres' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const position = registerUser(name, email, passwordHash);
    res.status(201).json({ success: true, position });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const password = req.body?.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }

  const user = stmts.findByEmail.get(email);
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  res.json({ token });
});

app.get('/api/me', authenticate, (req, res) => {
  const user = stmts.findById.get(req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  const { total } = stmts.total.get();
  res.json({ ...user, total });
});

app.listen(PORT, () => {
  console.log(`[kohi] Servidor en http://localhost:${PORT}`);
});
