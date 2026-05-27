const pool = require('../backend/db');

async function main() {
  try {
    const plRes = await pool.query("SELECT id, details_json FROM plannings WHERE site_id = 'RM950'");
    if (plRes.rowCount > 0) {
      console.log(JSON.stringify(plRes.rows[0].details_json, null, 2));
    } else {
      console.log('No planning found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
