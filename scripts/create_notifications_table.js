const pool = require('../backend/db');

const sql = `
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'planning_created', 'planning_reopened'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    planning_id VARCHAR(50) REFERENCES plannings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function main() {
  try {
    console.log('Running migration: creating notifications table...');
    await pool.query(sql);
    console.log('✅ notifications table created or already exists.');
  } catch (err) {
    console.error('❌ Error creating notifications table:', err);
  } finally {
    await pool.end();
  }
}

main();
