const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/users — Listar todos los usuarios
router.get('/', async (req, res) => {
  try {
    const { role, status } = req.query;
    let query = 'SELECT * FROM users';
    const params = [];
    const conditions = [];

    if (role)   { conditions.push(`role = $${params.length + 1}`);   params.push(role); }
    if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/users/:id — Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users — Crear usuario
router.post('/', async (req, res) => {
  try {
    const { id, name, email, phone, company, role, photo_url, status } = req.body;
    const result = await pool.query(
      `INSERT INTO users (id, name, email, phone, company, role, photo_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, name, email, phone, company, role, photo_url, status || 'Activo']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/users/:id — Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, company, role, photo_url, status } = req.body;
    const result = await pool.query(
      `UPDATE users SET name=$1, email=$2, phone=$3, company=$4, role=$5,
       photo_url=$6, status=$7 WHERE id=$8 RETURNING *`,
      [name, email, phone, company, role, photo_url, status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
