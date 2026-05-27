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

// ── Configurar multer para subida de fotos físicas a la MAC ────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST /api/photos/upload — Recibir imagen física y devolver su URL pública de red
router.post('/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se recibió ningún archivo' });
    }

    // Obtener la IP de red local del Mac
    const os = require('os');
    function getMacNetworkIp() {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) {
              return net.address;
            }
          }
        }
      }
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
      return 'localhost';
    }

    const ip = getMacNetworkIp();
    const port = process.env.PORT || 3001;
    let host = req.headers.host || `${ip}:${port}`;

    // Si la petición viene de localhost o 127.0.0.1 (ej: simuladores),
    // reescribimos el host con la IP real del Mac para que otros dispositivos de la red puedan descargar las fotos.
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      const parts = host.split(':');
      const reqPort = parts[1] || port;
      host = `${ip}:${reqPort}`;
    }

    const protocol = req.secure ? 'https' : 'http';
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    console.log(`📸 Imagen física subida a la Mac: ${req.file.filename} -> ${fileUrl}`);

    res.status(201).json({
      success: true,
      url: fileUrl,
      filename: req.file.filename
    });
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
       VALUES ($1,$2,$3,$4,$5,timezone('America/Santiago', $6::timestamptz)) RETURNING *`,
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
