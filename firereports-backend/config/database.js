// firereports-backend/config/database.js
// Banco de dados 100% local: SQLite embutido no próprio Node (node:sqlite).
// Nenhum serviço externo, nenhuma API de terceiro, nenhuma internet necessária.
// O banco fica salvo como um arquivo: firereports-backend/data/firereports.db
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH   = path.join(DATA_DIR, 'firereports.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);


db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    cpf        TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id         TEXT PRIMARY KEY,
    user_id    TEXT,
    user_name  TEXT,
    lat        REAL NOT NULL,
    lng        REAL NOT NULL,
    level      TEXT,
    category   TEXT,
    info       TEXT NOT NULL DEFAULT '',
    photo_url  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_user_id    ON reports (user_id);
`);

// Gera um id único simples (sem depender de nenhuma lib externa de uuid)
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const PUBLIC_USER_COLS = 'id, name, email, cpf, role, created_at';

export const DB = {
  // ── USUÁRIOS ──────────────────────────────────────────────
  async createUser({ name, email, cpf, password }) {
    try {
      const dup = db.prepare(
        `SELECT email, cpf FROM users WHERE email = ? OR cpf = ? LIMIT 1`
      ).get(email, cpf);

      if (dup) {
        return dup.email === email
          ? { ok: false, msg: 'E-mail já cadastrado.' }
          : { ok: false, msg: 'CPF já cadastrado.' };
      }

      const hash = await bcrypt.hash(password, 10);
      const id   = newId();

      db.prepare(
        `INSERT INTO users (id, name, email, cpf, password) VALUES (?, ?, ?, ?, ?)`
      ).run(id, name, email, cpf, hash);

      const user = db.prepare(`SELECT ${PUBLIC_USER_COLS} FROM users WHERE id = ?`).get(id);
      return { ok: true, user };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  },

  async loginUser(email, password) {
    try {
      const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
      if (!user) return { ok: false, msg: 'E-mail ou senha incorretos.' };

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return { ok: false, msg: 'E-mail ou senha incorretos.' };

      delete user.password;
      return { ok: true, user, role: user.role };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  },

  async getUserById(id) {
    try {
      return db.prepare(`SELECT ${PUBLIC_USER_COLS} FROM users WHERE id = ?`).get(id) || null;
    } catch { return null; }
  },

  async getAllUsers() {
    try {
      return db.prepare(
        `SELECT id, name, email, created_at FROM users ORDER BY created_at DESC`
      ).all();
    } catch { return []; }
  },

  // ── DENÚNCIAS ─────────────────────────────────────────────
  async addReport({ lat, lng, level, category, info, photoUrl, userId, userName }) {
    try {
      const id = newId();
      db.prepare(`
        INSERT INTO reports (id, user_id, user_name, lat, lng, level, category, info, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, userName, lat, lng, level, category, info || '', photoUrl || null);

      const report = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id);
      return { ok: true, report };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  },

  async getReports() {
    try {
      return db.prepare(`SELECT * FROM reports ORDER BY created_at DESC`).all();
    } catch { return []; }
  },

  async getReportsByUser(userId) {
    try {
      return db.prepare(
        `SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC`
      ).all(userId);
    } catch { return []; }
  },

  async deleteReport(id, { userId, isAdmin }) {
    try {
      const result = isAdmin
        ? db.prepare(`DELETE FROM reports WHERE id = ?`).run(id)
        : db.prepare(`DELETE FROM reports WHERE id = ? AND user_id = ?`).run(id, userId);

      if (result.changes === 0) {
        return { ok: false, msg: 'Denúncia não encontrada ou sem permissão.' };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }
};