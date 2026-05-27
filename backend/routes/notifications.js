const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/notifications/worker/:workerId — Listar notificaciones de un trabajador
router.get('/worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const result = await pool.query(
      `SELECT n.*, p.site_id, s.code as site_code, s.name as site_name
       FROM notifications n
       LEFT JOIN plannings p ON n.planning_id = p.id
       LEFT JOIN sites s ON p.site_id = s.id
       WHERE n.worker_id = $1
       ORDER BY n.created_at DESC`,
      [workerId]
    );
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/:id/read — Marcar una notificación como leída
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/worker/:workerId/read-all — Marcar todas las notificaciones de un trabajador como leídas
router.put('/worker/:workerId/read-all', async (req, res) => {
  try {
    const { workerId } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE worker_id = $1',
      [workerId]
    );
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/notifications/:id — Eliminar una notificación
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
    if (!result.rowCount) {
      return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
    }
    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
