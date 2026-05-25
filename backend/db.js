const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'proyectosapp_db',
  user:     process.env.DB_USER     || 'proyectosapp_user',
  password: process.env.DB_PASSWORD || 'proyectos2026',
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL — Base de datos:', process.env.DB_NAME || 'proyectosapp_db');
    release();
  }
});

module.exports = pool;
