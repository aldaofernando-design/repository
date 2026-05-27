const pool = require('../backend/db');

async function main() {
  try {
    const plRes = await pool.query("SELECT * FROM plannings WHERE site_id = 'RM950'");
    console.log('\n=== PLANIFICACIÓN PARA RM950 ===');
    console.log(JSON.stringify(plRes.rows, null, 2));

    if (plRes.rowCount > 0) {
      const plId = plRes.rows[0].id;
      const dgRes = await pool.query("SELECT * FROM datos_generales WHERE planning_id = $1", [plId]);
      console.log('\n=== DATOS GENERALES PARA RM950 ===');
      console.log(JSON.stringify(dgRes.rows, null, 2));

      const photoRes = await pool.query("SELECT * FROM photos WHERE planning_id = $1", [plId]);
      console.log('\n=== FOTOS PARA RM950 ===');
      console.log(JSON.stringify(photoRes.rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
