// firereports-backend/routes/reports.js
import { Router } from 'express';
import { DB } from '../config/database.js';
import { requireAuth } from './users.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await DB.getReports());
});

router.get('/mine', requireAuth, async (req, res) => {
  res.json(await DB.getReportsByUser(req.user.id));
});

router.post('/', requireAuth, async (req, res) => {
  const { lat, lng, level, category, info, photoBase64 } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number')
    return res.status(400).json({ ok: false, msg: 'Coordenadas inválidas.' });

  // user_id/user_name vêm da sessão, não do corpo — senão dá para se passar por outro
  const r = await DB.addReport({
    lat, lng, level, category, info,
    photoUrl: photoBase64 || null,
    userId: req.user.id,
    userName: req.user.name
  });
  res.status(r.ok ? 201 : 400).json(r);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const r = await DB.deleteReport(req.params.id, {
    userId: req.user.id,
    isAdmin: req.user.role === 'admin'
  });
  res.status(r.ok ? 200 : 403).json(r);
});

export default router;