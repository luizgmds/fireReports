import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, 'data', 'firereports.db'));

const email = process.argv[2];
if (!email) { console.log('Uso: node promote.js seu@email.com'); process.exit(1); }

const result = db.prepare(`UPDATE users SET role = 'admin' WHERE email = ?`).run(email);
console.log(result.changes > 0 ? `✅ ${email} agora é admin.` : '❌ E-mail não encontrado.');