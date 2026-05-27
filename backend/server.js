const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

const path = require('path');

// ── Middlewares ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/users',         require('./routes/users'));
app.use('/api/sites',         require('./routes/sites'));
app.use('/api/plannings',     require('./routes/plannings'));
app.use('/api/photos',        require('./routes/photos'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status:  'OK',
    message: '🚀 ProyectosApp Backend API corriendo',
    version: '1.0.0',
    endpoints: {
      users:     '/api/users',
      sites:     '/api/sites',
      plannings: '/api/plannings',
      photos:    '/api/photos',
      reports:   '/api/reports/summary',
    }
  });
});

// ── Manejo de errores global ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
});

// ── Iniciar servidor ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ProyectosApp Backend corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   GET  http://localhost:${PORT}/api/users`);
  console.log(`   GET  http://localhost:${PORT}/api/sites`);
  console.log(`   GET  http://localhost:${PORT}/api/plannings`);
  console.log(`   GET  http://localhost:${PORT}/api/reports/summary`);
});

module.exports = app;
