const { Pool, types } = require('pg');
types.setTypeParser(1082, (val) => val); // Return DATE columns as YYYY-MM-DD raw strings

require('dotenv').config();

// En macOS con Homebrew, PostgreSQL usa el usuario del sistema sin contraseña
const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'proyectosapp_db',
  user:     process.env.DB_USER || process.env.USER || 'fernandoaldao',
  password: process.env.DB_PASSWORD || '',
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
