// firereports-backend/server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import usersRouter from './routes/users.js';
import reportsRouter from './routes/reports.js';

const app  = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) throw new Error('Defina JWT_SECRET no .env');

app.use(express.json({ limit: '10mb' })); // fotos em base64 são grandes
app.use(cookieParser());

// Front-end (seus .html, styles.css, auth.js, scripts.js) — ajuste o caminho
// se eles não estiverem numa pasta chamada "public" um nível acima.
app.use(express.static('../'));

app.use('/api', usersRouter);
app.use('/api/reports', reportsRouter);

app.listen(PORT, () => console.log(`API em http://localhost:${PORT}`));