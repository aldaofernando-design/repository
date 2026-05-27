const pool = require('../backend/db');

async function main() {
  try {
    const plRes = await pool.query("SELECT id, details_json FROM plannings WHERE site_id = 'RM950'");
    if (plRes.rowCount === 0) {
      console.log('No planning found for RM950');
      return;
    }
    const planning = plRes.rows[0];
    console.log(`Processing planning ID: ${planning.id}`);

    const url = `http://localhost:3001/api/plannings/${planning.id}`;
    
    // Enviar el details_json existente tal cual
    const data = {
      ...planning.details_json
    };

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const json = await res.json();
    console.log('API Response Success:', json.success);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
