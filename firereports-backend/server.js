// firereports-backend/server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import usersRouter from './routes/users.js';
import reportsRouter from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) throw new Error('Defina JWT_SECRET no .env');

app.use(express.json({ limit: '10mb' })); // fotos em base64 são grandes
app.use(cookieParser());

// Serve os .html, .css, auth.js, scripts.js, api.js — que estão um nível
// acima (a raiz do repositório, final-reports-main/).
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

app.use('/api', usersRouter);
app.use('/api/reports', reportsRouter);

// Qualquer rota que não seja /api/* cai no index.html (navegação direta por URL)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));