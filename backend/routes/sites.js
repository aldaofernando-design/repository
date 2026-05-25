const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/sites — Listar todos los sitios
router.get('/', async (req, res) => {
  try {
    const { proyecto, commune, search } = req.query;
    let query = 'SELECT * FROM sites';
    const params = [];
    const conditions = [];

    if (proyecto)  { conditions.push(`proyecto ILIKE $${params.length + 1}`);   params.push(`%${proyecto}%`); }
    if (commune)   { conditions.push(`commune ILIKE $${params.length + 1}`);    params.push(`%${commune}%`); }
    if (search)    { conditions.push(`(name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1} OR address ILIKE $${params.length + 1})`); params.push(`%${search}%`); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY code';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sites/:id — Obtener sitio por ID con sus planificaciones
router.get('/:id', async (req, res) => {
  try {
    const site = await pool.query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
    if (!site.rowCount) return res.status(404).json({ success: false, error: 'Sitio no encontrado' });

    const plannings = await pool.query(
      `SELECT p.*, u.name as worker_name, u.role as worker_role
       FROM plannings p
       LEFT JOIN users u ON p.worker_id = u.id
       WHERE p.site_id = $1
       ORDER BY p.scheduled_date DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...site.rows[0], plannings: plannings.rows }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sites — Crear sitio
router.post('/', async (req, res) => {
  try {
    const { id, code, name, commune, address, latitude, longitude, region, estado_excel, proyecto, apagado_bafi } = req.body;
    const result = await pool.query(
      `INSERT INTO sites (id, code, name, commune, address, latitude, longitude, region, estado_excel, proyecto, apagado_bafi)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, code, name, commune, address, latitude, longitude, region, estado_excel, proyecto, apagado_bafi || false]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
