/**
 * update_schema.js
 * Script programático para añadir la columna details_json a la tabla plannings.
 */
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'proyectosapp_db',
  user:     process.env.DB_USER || process.env.USER || 'fernandoaldao',
  password: process.env.DB_PASSWORD || '',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔄 Ejecutando migración de esquema en PostgreSQL...');
    await client.query('ALTER TABLE plannings ADD COLUMN IF NOT EXISTS details_json JSONB;');
    console.log('✅ Columna details_json añadida con éxito a la tabla plannings.');
    
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);');
    console.log('✅ Columnas latitude y longitude añadidas con éxito a la tabla users.');
  } catch (err) {
    console.error('❌ Error actualizando esquema:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
