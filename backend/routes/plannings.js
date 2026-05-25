const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/plannings — Listar planificaciones con filtros
router.get('/', async (req, res) => {
  try {
    const { status, worker_id, site_id, date } = req.query;
    let query = `
      SELECT p.*,
             s.code  AS site_code,
             s.name  AS site_name,
             s.commune,
             s.proyecto,
             u.name  AS worker_name,
             u.role  AS worker_role,
             u.phone AS worker_phone
      FROM plannings p
      LEFT JOIN sites s ON p.site_id  = s.id
      LEFT JOIN users u ON p.worker_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (status)    { conditions.push(`p.status = $${params.length + 1}`);           params.push(status); }
    if (worker_id) { conditions.push(`p.worker_id = $${params.length + 1}`);        params.push(worker_id); }
    if (site_id)   { conditions.push(`p.site_id = $${params.length + 1}`);          params.push(site_id); }
    if (date)      { conditions.push(`p.scheduled_date = $${params.length + 1}`);   params.push(date); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY p.scheduled_date DESC, p.id';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/plannings/:id — Detalle completo de una planificación
router.get('/:id', async (req, res) => {
  try {
    // Planificación base
    const planning = await pool.query(`
      SELECT p.*,
             s.code AS site_code, s.name AS site_name, s.commune, s.address,
             s.latitude, s.longitude, s.proyecto,
             u.name AS worker_name, u.email AS worker_email, u.phone AS worker_phone
      FROM plannings p
      LEFT JOIN sites s ON p.site_id  = s.id
      LEFT JOIN users u ON p.worker_id = u.id
      WHERE p.id = $1`, [req.params.id]);

    if (!planning.rowCount) return res.status(404).json({ success: false, error: 'Planificación no encontrada' });

    // Datos relacionados en paralelo
    const [hallazgos, datosGen, apagadoEq, apagadoBafi, photos] = await Promise.all([
      pool.query('SELECT * FROM hallazgos         WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM datos_generales   WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM apagado_equipos   WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM apagado_bafi      WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM photos            WHERE planning_id = $1 ORDER BY id', [req.params.id]),
    ]);

    res.json({
      success: true,
      data: {
        ...planning.rows[0],
        hallazgos:       hallazgos.rows,
        datos_generales: datosGen.rows[0]  || null,
        apagado_equipos: apagadoEq.rows[0] || null,
        apagado_bafi:    apagadoBafi.rows[0] || null,
        photos:          photos.rows,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/plannings — Crear planificación
router.post('/', async (req, res) => {
  try {
    const { id, site_id, worker_id, status, scheduled_date, observations, created_by } = req.body;
    const result = await pool.query(
      `INSERT INTO plannings (id, site_id, worker_id, status, scheduled_date, observations, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, site_id, worker_id, status || 'Planificado', scheduled_date, observations, created_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/plannings/:id — Actualizar estado de planificación
router.put('/:id', async (req, res) => {
  try {
    const { status, start_time, end_time, observations } = req.body;
    const result = await pool.query(
      `UPDATE plannings
       SET status=$1, start_time=$2, end_time=$3, observations=$4
       WHERE id=$5 RETURNING *`,
      [status, start_time, end_time, observations, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, error: 'Planificación no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
