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
    console.log('Inserting mock planning for AM849 with bafi data...');
    
    // Check if worker u3 exists
    const workerRes = await client.query("SELECT id FROM users WHERE role = 'Trabajador' LIMIT 1;");
    const workerId = workerRes.rowCount > 0 ? workerRes.rows[0].id : 'u3';
    
    // Check if coordinator u2 exists
    const coordRes = await client.query("SELECT id FROM users WHERE role = 'Coordinador' LIMIT 1;");
    const coordId = coordRes.rowCount > 0 ? coordRes.rows[0].id : 'u2';

    const details = {
      datosGenerales: {
        tipoEstructura: 'Monopolo',
        tipoContenedor: 'Gabinete exterior',
        tipoEmpalme: 'Trifásico',
        ampereEmpalme: ['15.20', '14.80', '15.10'],
        capacidadProteccion: '40A',
        numeroMedidor: '12345678',
        lecturaConsumo: '2450.8',
        fotoFueraContenedor: 'https://picsum.photos/id/10/400/300.jpg',
        fotoEstructura: 'https://picsum.photos/id/11/400/300.jpg',
        fotoMedidor: 'https://picsum.photos/id/20/400/300.jpg',
        fotoSectorMedidor: 'https://picsum.photos/id/21/400/300.jpg',
        fotosEmpalme: [
          'https://picsum.photos/id/16/400/300.jpg',
          'https://picsum.photos/id/17/400/300.jpg'
        ],
        fotosGeneralesSitio: [
          'https://picsum.photos/id/12/400/300.jpg',
          'https://picsum.photos/id/13/400/300.jpg'
        ],
        fotosInteriorContenedor: [
          'https://picsum.photos/id/14/400/300.jpg',
          'https://picsum.photos/id/15/400/300.jpg'
        ]
      },
      apagadoBafiSector1: {
        estadoBasebandSector1: 'Encendido',
        confirmadoApagadoRetirar: true,
        fotoBaseband1Encendida: 'https://picsum.photos/id/22/400/300.jpg',
        fotoBreakerBaseband1Encendido: 'https://picsum.photos/id/23/400/300.jpg',
        fotoBreakerBaseband1Apagado: 'https://picsum.photos/id/24/400/300.jpg',
        fotoEspacioBaseband1Retirada: 'https://picsum.photos/id/25/400/300.jpg'
      },
      apagadoBafiSector2: {
        estadoBasebandSector2: 'Encendido',
        confirmadoApagadoRetirar: true,
        fotoBaseband2Encendida: 'https://picsum.photos/id/26/400/300.jpg',
        fotoBreakerBaseband2Encendido: 'https://picsum.photos/id/27/400/300.jpg',
        fotoBreakerBaseband2Apagado: 'https://picsum.photos/id/28/400/300.jpg',
        fotoEspacioBaseband2Retirada: 'https://picsum.photos/id/29/400/300.jpg'
      },
      apagadoBafiSector3: {
        estadoBasebandSector3: 'Encendido',
        confirmadoApagadoRetirar: false,
        fotoBaseband3Encendida: 'https://picsum.photos/id/30/400/300.jpg',
        fotoBreakerBaseband3Encendido: 'https://picsum.photos/id/31/400/300.jpg',
        fotoBreakerBaseband3Apagado: 'https://picsum.photos/id/32/400/300.jpg',
        fotoEspacioBaseband3Retirada: 'https://picsum.photos/id/33/400/300.jpg'
      },
      apagadoAntenaSector1: {
        estadoAntenaSector1: 'Encendida',
        seApagaraAntenaS1: 'Si',
        fotoBreakerAntenaS1Encendido: 'https://picsum.photos/id/34/400/300.jpg',
        fotoBreakerAntenaS1Apagado: 'https://picsum.photos/id/35/400/300.jpg'
      },
      apagadoAntenaSector2: {
        estadoAntenaSector2: 'Encendida',
        seApagaraAntenaS2: 'Si',
        fotoBreakerAntenaS2Encendido: 'https://picsum.photos/id/36/400/300.jpg',
        fotoBreakerAntenaS2Apagado: 'https://picsum.photos/id/37/400/300.jpg'
      },
      apagadoAntenaSector3: {
        estadoAntenaSector3: 'Encendida',
        seApagaraAntenaS3: 'No',
        fotoBreakerAntenaS3Encendido: 'https://picsum.photos/id/38/400/300.jpg',
        fotoBreakerAntenaS3Apagado: 'https://picsum.photos/id/39/400/300.jpg'
      },
      alarmasExternas: {
        tecnologiaAlarmas: '3G',
        motivosNoImplementacion: 'Se migrarán alarmas a LTE en siguiente fase.',
        fotoAlarmasOVP: 'https://picsum.photos/id/40/400/300.jpg',
        fotoAlarmasEquipos: 'https://picsum.photos/id/41/400/300.jpg'
      },
      hallazgos: {
        observaciones: 'Entrada sin problemas. Candado operativo.',
        fotos: [
          'https://picsum.photos/id/42/400/300.jpg',
          'https://picsum.photos/id/43/400/300.jpg',
          'https://picsum.photos/id/44/400/300.jpg'
        ]
      }
    };

    // Insert or update planning for AM849
    await client.query("DELETE FROM plannings WHERE site_id = 'AM849';");
    const insertRes = await client.query(
      `INSERT INTO plannings (id, site_id, worker_id, status, scheduled_date, start_time, end_time, observations, created_by, details_json)
       VALUES ('p_test_am849', 'AM849', $1, 'Ejecutado', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP, 'Test de generación de informe', $2, $3)
       RETURNING *;`,
      [workerId, coordId, JSON.stringify(details)]
    );
    console.log('✅ Mock planning inserted:', insertRes.rows[0].id);

    // Populate child relational tables so that queries join correctly
    await client.query("DELETE FROM hallazgos WHERE planning_id = 'p_test_am849';");
    await client.query("INSERT INTO hallazgos (planning_id, observaciones) VALUES ('p_test_am849', 'Entrada sin problemas. Candado operativo.');");

    await client.query("DELETE FROM datos_generales WHERE planning_id = 'p_test_am849';");
    await client.query(
      `INSERT INTO datos_generales (
        planning_id, tipo_estructura, tipo_contenedor, tipo_empalme, ampere_empalme,
        capacidad_proteccion, numero_medidor, lectura_consumo,
        foto_estructura_uri, foto_fuera_contenedor_uri, foto_medidor_uri, foto_sector_medidor_uri
      ) VALUES ('p_test_am849', 'Monopolo', 'Gabinete exterior', 'Trifásico', '["15.20", "14.80", "15.10"]',
        '40A', '12345678', '2450.8',
        'https://picsum.photos/id/11/400/300.jpg', 'https://picsum.photos/id/10/400/300.jpg', 'https://picsum.photos/id/20/400/300.jpg', 'https://picsum.photos/id/21/400/300.jpg');`
    );

    console.log('✅ Child relational records populated successfully.');
  } catch (err) {
    console.error('❌ Error creating test data:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
