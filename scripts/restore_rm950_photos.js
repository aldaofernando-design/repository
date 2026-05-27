const pool = require('../backend/db');

async function main() {
  try {
    const plRes = await pool.query("SELECT id, details_json FROM plannings WHERE site_id = 'RM950'");
    if (plRes.rowCount === 0) {
      console.log('No planning found for RM950');
      return;
    }
    const planning = plRes.rows[0];
    const details = { ...planning.details_json };

    // Restaurar Sector 2
    if (details.apagadoAntenaSector2) {
      details.apagadoAntenaSector2.fotoConsumoInicialCc = 'http://192.168.1.84:3001/uploads/photo-1779845732868-445464491.jpg';
      details.apagadoAntenaSector2.fotoConsumoFinalCc = 'http://192.168.1.84:3001/uploads/photo-1779845732970-110747262.jpg';
      details.apagadoAntenaSector2.confirmadoApagadoAntena = true;
      details.apagadoAntenaSector2.textoCompartida5G = '';
    }

    // Restaurar Sector 3
    if (details.apagadoAntenaSector3) {
      details.apagadoAntenaSector3.fotoConsumoInicialCc = 'http://192.168.1.84:3001/uploads/photo-1779845733057-338402126.jpg';
      details.apagadoAntenaSector3.fotoConsumoFinalCc = 'http://192.168.1.84:3001/uploads/photo-1779845733208-204124170.jpg';
      details.apagadoAntenaSector3.confirmadoApagadoAntena = true;
      details.apagadoAntenaSector3.textoCompartida5G = '';
    }

    // Guardar en la base de datos
    await pool.query("UPDATE plannings SET details_json = $1 WHERE id = $2", [JSON.stringify(details), planning.id]);
    console.log('details_json restaurado con éxito para RM950.');

    // Enviar petición PUT a la API para re-procesar las fotos a la tabla 'photos'
    const url = `http://localhost:3001/api/plannings/${planning.id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    const json = await res.json();
    console.log('API Reprocess Success:', json.success);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
