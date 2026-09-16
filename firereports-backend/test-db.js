import 'dotenv/config';
import { pool } from './config/database.js';

const { rows } = await pool.query('SELECT now()');
console.log('Conectado! Hora do servidor:', rows[0].now);
process.exit(0);