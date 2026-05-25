const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/photos?planning_id=p2&category=hallazgos
router.get('/', async (req, res) => {
  try {
    const { planning_id, category } = req.query;
    let query = 'SELECT * FROM photos';
    const params = [];
    const conditions = [];

    if (planning_id) { conditions.push(`planning_id = $${params.length + 1}`); params.push(planning_id); }
    if (category)    { conditions.push(`category = $${params.length + 1}`);    params.push(category); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY id';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/photos — Registrar nueva foto
router.post('/', async (req, res) => {
  try {
    const { planning_id, category, uri, latitude, longitude, captured_at } = req.body;
    const result = await pool.query(
      `INSERT INTO photos (planning_id, category, uri, latitude, longitude, captured_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [planning_id, category, uri, latitude, longitude, captured_at]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/photos/:id — Eliminar foto
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, error: 'Foto no encontrada' });
    res.json({ success: true, message: 'Foto eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
