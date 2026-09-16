// firereports-backend/config/database.js
// Conexão com PostgreSQL + todas as funções que antes falavam com o Supabase.
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

const PUBLIC_USER = 'id, name, email, cpf, role, created_at';

export const DB = {
  // ── USUÁRIOS ──────────────────────────────────────────────
  async createUser({ name, email, cpf, password }) {
    try {
      const dup = await query(
        `SELECT email, cpf FROM users WHERE email = $1 OR cpf = $2 LIMIT 1`,
        [email, cpf]
      );
      if (dup.length) {
        return dup[0].email === email
          ? { ok: false, msg: 'E-mail já cadastrado.' }
          : { ok: false, msg: 'CPF já cadastrado.' };
      }

      const hash = await bcrypt.hash(password, 10);
      const rows = await query(
        `INSERT INTO users (name, email, cpf, password)
         VALUES ($1, $2, $3, $4)
         RETURNING ${PUBLIC_USER}`,
        [name, email, cpf, hash]
      );
      return { ok: true, user: rows[0] };
    } catch (e) {
      if (e.code === '23505') return { ok: false, msg: 'E-mail ou CPF já cadastrado.' };
      return { ok: false, msg: e.message };
    }
  },

  async loginUser(email, password) {
    try {
      const rows = await query(`SELECT * FROM users WHERE email = $1`, [email]);
      if (!rows.length) return { ok: false, msg: 'E-mail ou senha incorretos.' };

      const user = rows[0];
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
      const rows = await query(`SELECT ${PUBLIC_USER} FROM users WHERE id = $1`, [id]);
      return rows[0] || null;
    } catch { return null; }
  },

  async getAllUsers() {
    try {
      return await query(
        `SELECT id, name, email, created_at FROM users ORDER BY created_at DESC`
      );
    } catch { return []; }
  },

  // ── DENÚNCIAS ─────────────────────────────────────────────
  async addReport({ lat, lng, level, category, info, photoUrl, userId, userName }) {
    try {
      const rows = await query(
        `INSERT INTO reports (user_id, user_name, lat, lng, level, category, info, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, userName, lat, lng, level, category, info || '', photoUrl || null]
      );
      return { ok: true, report: rows[0] };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  },

  async getReports() {
    try {
      return await query(`SELECT * FROM reports ORDER BY created_at DESC`);
    } catch { return []; }
  },

  async getReportsByUser(userId) {
    try {
      return await query(
        `SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
    } catch { return []; }
  },

  async deleteReport(id, { userId, isAdmin }) {
    try {
      const rows = isAdmin
        ? await query(`DELETE FROM reports WHERE id = $1 RETURNING id`, [id])
        : await query(`DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
      if (!rows.length) return { ok: false, msg: 'Denúncia não encontrada ou sem permissão.' };
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }
};