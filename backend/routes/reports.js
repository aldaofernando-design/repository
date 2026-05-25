const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/reports/summary — Resumen estadístico general
router.get('/summary', async (req, res) => {
  try {
    const [
      totalSites,
      totalUsers,
      totalPlannings,
      planningsByStatus,
      planningsByWorker,
      recentExecuted,
      totalPhotos,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM sites'),
      pool.query('SELECT COUNT(*) AS total FROM users WHERE status = \'Activo\''),
      pool.query('SELECT COUNT(*) AS total FROM plannings'),
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM plannings
        GROUP BY status
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT u.name AS worker, u.role, COUNT(p.id) AS total_plannings,
               SUM(CASE WHEN p.status = 'Ejecutado' THEN 1 ELSE 0 END) AS executed
        FROM plannings p
        JOIN users u ON p.worker_id = u.id
        GROUP BY u.id, u.name, u.role
        ORDER BY total_plannings DESC
      `),
      pool.query(`
        SELECT p.id, p.scheduled_date, p.start_time, p.end_time,
               s.code AS site_code, s.name AS site_name, s.proyecto,
               u.name AS worker_name
        FROM plannings p
        JOIN sites s ON p.site_id  = s.id
        JOIN users u ON p.worker_id = u.id
        WHERE p.status = 'Ejecutado'
        ORDER BY p.end_time DESC
        LIMIT 5
      `),
      pool.query('SELECT COUNT(*) AS total FROM photos'),
    ]);

    res.json({
      success: true,
      data: {
        totales: {
          sitios:        parseInt(totalSites.rows[0].total),
          usuarios:      parseInt(totalUsers.rows[0].total),
          planificaciones: parseInt(totalPlannings.rows[0].total),
          fotos:         parseInt(totalPhotos.rows[0].total),
        },
        por_estado:    planningsByStatus.rows,
        por_trabajador: planningsByWorker.rows,
        ultimos_ejecutados: recentExecuted.rows,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/daily?date=2026-05-25 — Planificaciones de un día
router.get('/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT p.*,
             s.code AS site_code, s.name AS site_name, s.commune,
             s.address, s.latitude, s.longitude, s.proyecto,
             u.name AS worker_name, u.phone AS worker_phone
      FROM plannings p
      JOIN sites s ON p.site_id  = s.id
      JOIN users u ON p.worker_id = u.id
      WHERE p.scheduled_date = $1
      ORDER BY p.status, u.name
    `, [targetDate]);

    const summary = {
      fecha: targetDate,
      total: result.rowCount,
      planificados: result.rows.filter(r => r.status === 'Planificado').length,
      en_ejecucion: result.rows.filter(r => r.status === 'En ejecución').length,
      ejecutados:   result.rows.filter(r => r.status === 'Ejecutado').length,
    };

    res.json({ success: true, summary, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
