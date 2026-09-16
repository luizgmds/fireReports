// api.js — substitui o antigo db.js na raiz do projeto (mesmo lugar, novo nome).
// Atualize os <script> nos seus .html: troque src="db.js" por src="api.js"
// Mesma interface de antes (DB.loginUser, DB.getReports...), mas fala com a API.

async function apiCall(path, options = {}) {
  const res = await fetch(`/api/${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || `Erro ${res.status}`);
  return data;
}

const DB = {
  _session: null,

  // Chame uma vez ao carregar a página: await DB.loadSession()
  async loadSession() {
    try {
      const { session } = await apiCall('me');
      this._session = session;
    } catch { this._session = null; }
    return this._session;
  },
  getSession() { return this._session; },
  isAdmin()    { return this._session?.role === 'admin'; },

  async logout() {
    await apiCall('logout', { method: 'POST' });
    this._session = null;
  },

  // ── USUÁRIOS ────────────────────────────────────────────
  async createUser({ name, email, cpf, password }) {
    try {
      const r = await apiCall('register', {
        method: 'POST',
        body: JSON.stringify({ name, email, cpf, password })
      });
      await this.loadSession();
      return r;
    } catch (e) { return { ok: false, msg: e.message }; }
  },

  async loginUser(email, password) {
    try {
      const r = await apiCall('login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      await this.loadSession();
      return r;
    } catch (e) { return { ok: false, msg: e.message }; }
  },

  async getUserById(id) {
    try { return await apiCall(`users/${id}`); } catch { return null; }
  },

  async getAllUsers() {
    try { return await apiCall('users'); } catch { return []; }
  },

  // ── DENÚNCIAS ───────────────────────────────────────────
  async addReport({ lat, lng, level, category, info, photoBase64 }) {
    try {
      return await apiCall('reports', {
        method: 'POST',
        body: JSON.stringify({ lat, lng, level, category, info, photoBase64 })
      });
    } catch (e) { return { ok: false, msg: e.message }; }
  },

  async getReports() {
    try { return await apiCall('reports'); } catch { return []; }
  },

  async getReportsByUser() {
    try { return await apiCall('reports/mine'); } catch { return []; }
  },

  async deleteReport(id) {
    try { return await apiCall(`reports/${id}`, { method: 'DELETE' }); }
    catch (e) { return { ok: false, msg: e.message }; }
  }
};