const pool = require('../backend/db');

async function main() {
  try {
    const plRes = await pool.query("SELECT id, status, details_json FROM plannings WHERE site_id = 'RM950'");
    console.log('\n=== PLANIFICACIÓN PARA RM950 ===');
    for (const row of plRes.rows) {
      console.log('ID:', row.id);
      console.log('Status:', row.status);
    }

    if (plRes.rowCount > 0) {
      const plId = plRes.rows[0].id;
      const photosRes = await pool.query("SELECT * FROM photos WHERE planning_id = $1", [plId]);
      console.log('\n=== TABLE photos FOR RM950 ===');
      console.log('Count:', photosRes.rowCount);
      for (const row of photosRes.rows) {
        console.log(`Category: ${row.category} | URI: ${row.uri}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
