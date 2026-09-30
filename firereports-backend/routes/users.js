// firereports-backend/routes/users.js
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { DB } from '../config/database.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

function setSession(res, user) {
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('qmd_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function getSession(req) {
  try { return jwt.verify(req.cookies.qmd_session, JWT_SECRET); }
  catch { return null; }
}

export function requireAuth(req, res, next) {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, msg: 'Não autenticado.' });
  req.user = s;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, msg: 'Acesso restrito.' });
  next();
}

// ── AUTH ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, cpf, password } = req.body || {};
  if (!name || !email || !cpf || !password)
    return res.status(400).json({ ok: false, msg: 'Preencha todos os campos.' });

  const r = await DB.createUser({ name, email, cpf, password });
  if (!r.ok) return res.status(400).json(r);
  setSession(res, r.user);
  res.json(r);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await DB.loginUser(email, password);
  if (!r.ok) return res.status(401).json(r);
  setSession(res, r.user);
  res.json(r);
});

router.post('/logout', (req, res) => {
  res.clearCookie('qmd_session');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ ok: true, session: getSession(req) });
});

// ── USUÁRIOS ──────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  res.json(await DB.getAllUsers());
});

router.get('/users/:id', requireAuth, async (req, res) => {
  res.json(await DB.getUserById(req.params.id));
});

// ── PROMOÇÃO TEMPORÁRIA PARA ADMIN ─────────────────────────
// Rota protegida por senha (ADMIN_SECRET no .env / Render), só pra usar
// uma vez quando não há acesso a terminal no ambiente de hospedagem.
// REMOVA esta rota depois de usá-la, por segurança.
router.get('/promote', async (req, res) => {
  const { email, secret } = req.query;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ ok: false, msg: 'Senha incorreta ou não configurada.' });
  }
  if (!email) return res.status(400).json({ ok: false, msg: 'Informe ?email=' });

  const r = await DB.promoteToAdmin(email);
  res.status(r.ok ? 200 : 404).json(r);
});

export default router;