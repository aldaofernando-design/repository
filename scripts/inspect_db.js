const pool = require('../backend/db');

async function main() {
  try {
    const pl = await pool.query('SELECT * FROM plannings');
    console.log('\n--- PLANIFICACIONES EN DB ---');
    console.log(pl.rows);

    const nt = await pool.query('SELECT * FROM notifications');
    console.log('\n--- NOTIFICACIONES EN DB ---');
    console.log(nt.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
