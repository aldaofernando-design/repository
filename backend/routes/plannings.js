const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/plannings — Listar planificaciones con filtros
router.get('/', async (req, res) => {
  try {
    const { status, worker_id, site_id, date } = req.query;
    let query = `
      SELECT p.*,
             s.code  AS site_code,
             s.name  AS site_name,
             s.commune,
             s.proyecto,
             u.name  AS worker_name,
             u.role  AS worker_role,
             u.phone AS worker_phone
      FROM plannings p
      LEFT JOIN sites s ON p.site_id  = s.id
      LEFT JOIN users u ON p.worker_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (status)    { conditions.push(`p.status = $${params.length + 1}`);           params.push(status); }
    if (worker_id) { conditions.push(`p.worker_id = $${params.length + 1}`);        params.push(worker_id); }
    if (site_id)   { conditions.push(`p.site_id = $${params.length + 1}`);          params.push(site_id); }
    if (date)      { conditions.push(`p.scheduled_date = $${params.length + 1}`);   params.push(date); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY p.scheduled_date DESC, p.id';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/plannings/:id — Detalle completo de una planificación
router.get('/:id', async (req, res) => {
  try {
    // Planificación base
    const planning = await pool.query(`
      SELECT p.*,
             s.code AS site_code, s.name AS site_name, s.commune, s.address,
             s.latitude, s.longitude, s.proyecto,
             u.name AS worker_name, u.email AS worker_email, u.phone AS worker_phone
      FROM plannings p
      LEFT JOIN sites s ON p.site_id  = s.id
      LEFT JOIN users u ON p.worker_id = u.id
      WHERE p.id = $1`, [req.params.id]);

    if (!planning.rowCount) return res.status(404).json({ success: false, error: 'Planificación no encontrada' });

    // Datos relacionados en paralelo
    const [hallazgos, datosGen, apagadoEq, apagadoBafi, photos] = await Promise.all([
      pool.query('SELECT * FROM hallazgos         WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM datos_generales   WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM apagado_equipos   WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM apagado_bafi      WHERE planning_id = $1', [req.params.id]),
      pool.query('SELECT * FROM photos            WHERE planning_id = $1 ORDER BY id', [req.params.id]),
    ]);

    res.json({
      success: true,
      data: {
        ...planning.rows[0],
        hallazgos:       hallazgos.rows,
        datos_generales: datosGen.rows[0]  || null,
        apagado_equipos: apagadoEq.rows[0] || null,
        apagado_bafi:    apagadoBafi.rows[0] || null,
        photos:          photos.rows,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/plannings — Crear planificación
router.post('/', async (req, res) => {
  try {
    const { id, site_id, worker_id, status, scheduled_date, observations, created_by } = req.body;
    const result = await pool.query(
      `INSERT INTO plannings (id, site_id, worker_id, status, scheduled_date, observations, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, site_id, worker_id, status || 'Planificado', scheduled_date, observations, created_by]
    );

    // Crear notificación si se asignó un trabajador
    if (worker_id) {
      try {
        const siteRes = await pool.query('SELECT code, name FROM sites WHERE id = $1', [site_id]);
        if (siteRes.rowCount > 0) {
          const site = siteRes.rows[0];
          let dateStr = '';
          if (scheduled_date) {
            if (typeof scheduled_date === 'string') {
              const parts = scheduled_date.split('T')[0].split('-');
              if (parts.length === 3) {
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
              } else {
                dateStr = scheduled_date.split('T')[0];
              }
            } else if (scheduled_date instanceof Date) {
              const day = String(scheduled_date.getDate()).padStart(2, '0');
              const month = String(scheduled_date.getMonth() + 1).padStart(2, '0');
              const year = scheduled_date.getFullYear();
              dateStr = `${day}-${month}-${year}`;
            } else {
              dateStr = String(scheduled_date);
            }
          }
          const message = `Se te asignado la ejecución del sitio: ${site.code} - ${site.name} para el día ${dateStr}`;
          await pool.query(
            `INSERT INTO notifications (worker_id, type, message, planning_id)
             VALUES ($1, 'planning_created', $2, $3)`,
            [worker_id, message, id]
          );
          console.log(`🔔 Notificación de planificación creada para el trabajador ${worker_id}`);
        }
      } catch (notifErr) {
        console.error('❌ Error al crear notificación de planificación:', notifErr.message);
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/plannings/:id — Actualizar estado e información detallada de planificación
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Obtener planificación existente antes de actualizar para verificar reapertura/reasignación
    const oldPlRes = await client.query('SELECT status, worker_id, site_id, scheduled_date FROM plannings WHERE id = $1', [req.params.id]);
    const oldPl = oldPlRes.rowCount > 0 ? oldPlRes.rows[0] : null;
    
    // 1. Extraer campos base de planificación
    const { status, startTime, endTime, observations, workerId, worker_id, date, scheduled_date } = req.body;
    
    const statusVal = status || req.body.status;
    const obsVal = observations || req.body.observations;
    const workerIdVal = workerId || worker_id || req.body.workerId || req.body.worker_id;
    const dateVal = date || scheduled_date || req.body.date || req.body.scheduled_date;

    const hasStartTime = req.body.hasOwnProperty('startTime') || req.body.hasOwnProperty('start_time');
    const hasEndTime = req.body.hasOwnProperty('endTime') || req.body.hasOwnProperty('end_time');

    let startTimeVal = hasStartTime ? (req.body.startTime !== undefined ? req.body.startTime : req.body.start_time) : null;
    let endTimeVal = hasEndTime ? (req.body.endTime !== undefined ? req.body.endTime : req.body.end_time) : null;

    if (startTimeVal === 'null' || startTimeVal === 'undefined' || startTimeVal === '') startTimeVal = null;
    if (endTimeVal === 'null' || endTimeVal === 'undefined' || endTimeVal === '') endTimeVal = null;

    // Actualizar la planificación base
    const plUpdate = await client.query(
      `UPDATE plannings
       SET status = COALESCE($1, status),
           start_time = CASE WHEN $8::boolean THEN timezone('America/Santiago', $2::timestamptz) ELSE start_time END,
           end_time = CASE WHEN $9::boolean THEN timezone('America/Santiago', $3::timestamptz) ELSE end_time END,
           observations = COALESCE($4, observations),
           worker_id = COALESCE($5, worker_id),
           scheduled_date = COALESCE($6, scheduled_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [statusVal, startTimeVal, endTimeVal, obsVal, workerIdVal, dateVal, req.params.id, hasStartTime, hasEndTime]
    );

    if (!plUpdate.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Planificación no encontrada' });
    }

    // Crear notificación si se reabrió o si se asignó un nuevo trabajador
    const isReopened = oldPl && oldPl.status === 'Ejecutado' && (statusVal === 'Planificado' || statusVal === 'En ejecución');
    const isNewAssignment = oldPl && workerIdVal && oldPl.worker_id !== workerIdVal;

    if (isReopened || isNewAssignment) {
      const targetWorkerId = workerIdVal || (oldPl ? oldPl.worker_id : null);
      const targetSiteId = oldPl ? oldPl.site_id : null;
      if (targetWorkerId && targetSiteId) {
        try {
          const siteRes = await client.query('SELECT code, name FROM sites WHERE id = $1', [targetSiteId]);
          if (siteRes.rowCount > 0) {
            const site = siteRes.rows[0];
            
            const rawDate = dateVal || (oldPl ? oldPl.scheduled_date : null);
            let dateStr = '';
            if (rawDate) {
              if (typeof rawDate === 'string') {
                const parts = rawDate.split('T')[0].split('-');
                if (parts.length === 3) {
                  dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else {
                  dateStr = rawDate.split('T')[0];
                }
              } else if (rawDate instanceof Date) {
                const day = String(rawDate.getDate()).padStart(2, '0');
                const month = String(rawDate.getMonth() + 1).padStart(2, '0');
                const year = rawDate.getFullYear();
                dateStr = `${day}-${month}-${year}`;
              } else {
                dateStr = String(rawDate);
              }
            }

            let message = '';
            let notifType = '';
            if (isReopened) {
              message = `Se te ha reabierto la ejecución del sitio: ${site.code} - ${site.name} para el día ${dateStr}`;
              notifType = 'planning_reopened';
            } else {
              message = `Se te asignado la ejecución del sitio: ${site.code} - ${site.name} para el día ${dateStr}`;
              notifType = 'planning_created';
            }
            
            await client.query(
              `INSERT INTO notifications (worker_id, type, message, planning_id)
               VALUES ($1, $2, $3, $4)`,
              [targetWorkerId, notifType, message, req.params.id]
            );
            console.log(`🔔 Notificación de ${notifType} creada para el trabajador ${targetWorkerId}`);
          }
        } catch (notifErr) {
          console.error('❌ Error al crear notificación en base de datos:', notifErr.message);
        }
      }
    }

    // Crear notificación si se finalizó la planificación (el trabajador cambia a estado Ejecutado)
    const isExecuted = oldPl && oldPl.status !== 'Ejecutado' && statusVal === 'Ejecutado';
    if (isExecuted) {
      const targetSiteId = oldPl.site_id;
      const workerIdToUse = oldPl.worker_id;
      if (targetSiteId && workerIdToUse) {
        try {
          const [siteRes, workerRes, coordinatorsRes] = await Promise.all([
            client.query('SELECT code, name FROM sites WHERE id = $1', [targetSiteId]),
            client.query('SELECT name FROM users WHERE id = $1', [workerIdToUse]),
            client.query("SELECT id FROM users WHERE role = 'Coordinador' OR role = 'Administrador'")
          ]);

          if (siteRes.rowCount > 0 && coordinatorsRes.rowCount > 0) {
            const site = siteRes.rows[0];
            const workerName = workerRes.rowCount > 0 ? workerRes.rows[0].name : 'Trabajador';
            
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const hrs = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            const formattedDateTime = `${day}-${month}-${year} a las ${hrs}:${mins}`;

            const message = `Sitio ${site.code} - ${site.name} finalizado el ${formattedDateTime} por ${workerName}`;

            for (const coord of coordinatorsRes.rows) {
              await client.query(
                `INSERT INTO notifications (worker_id, type, message, planning_id)
                 VALUES ($1, 'planning_executed', $2, $3)`,
                [coord.id, message, req.params.id]
              );
            }
            console.log(`🔔 Notificaciones de finalización enviadas a ${coordinatorsRes.rowCount} coordinadores/administradores`);
          }
        } catch (notifErr) {
          console.error('❌ Error al crear notificación de finalización para coordinadores:', notifErr.message);
        }
      }
    }

    // 2. Fusionar/actualizar details_json con los nuevos datos recibidos.
    // Para evitar pérdida de datos entre auto-guardados de diferentes secciones,
    // fusionamos las secciones de primer nivel (e.g. datosGenerales, hallazgos, evidenciaSalida).
    // Cada sección que se recibe sobreescribe por completo a la sección existente en la base de datos,
    // garantizando que cualquier cambio realizado por el trabajador (fotos eliminadas, modificadas,
    // lecturas de amperes o selecciones) sea guardado y persista correctamente.
    const existingRes = await client.query('SELECT details_json FROM plannings WHERE id = $1', [req.params.id]);
    const existing = existingRes.rows[0].details_json || {};
    
    // Columnas de la tabla plannings a excluir del merge de details_json
    const columnsToExclude = [
      'id', 'status', 'startTime', 'start_time', 'endTime', 'end_time',
      'observations', 'workerId', 'worker_id', 'date', 'scheduled_date',
      'site_id', 'siteId', 'created_by', 'created_at', 'updated_at'
    ];

    const merged = { ...existing };
    for (const key of Object.keys(req.body)) {
      if (!columnsToExclude.includes(key)) {
        merged[key] = req.body[key];
      }
    }

    if (hasStartTime) {
      merged.startTime = startTimeVal;
    }
    if (hasEndTime) {
      merged.endTime = endTimeVal;
    }
    if (statusVal !== undefined) {
      merged.status = statusVal;
    }

    await client.query(
      `UPDATE plannings SET details_json = $1::jsonb WHERE id = $2`,
      [JSON.stringify(merged), req.params.id]
    );

    // Obtener el estado consolidado de la planificación
    const fullPlRes = await client.query('SELECT details_json FROM plannings WHERE id = $1', [req.params.id]);
    const consolidatedDetails = fullPlRes.rows[0].details_json || {};


    // 3. Poblar tablas relacionales
    // 3.1 Hallazgos
    if (consolidatedDetails.hallazgos) {
      const h = consolidatedDetails.hallazgos;
      await client.query('DELETE FROM hallazgos WHERE planning_id = $1', [req.params.id]);
      await client.query(
        'INSERT INTO hallazgos (planning_id, observaciones) VALUES ($1, $2)',
        [req.params.id, h.observaciones || '']
      );
    }

    // 3.2 Datos Generales
    if (consolidatedDetails.datosGenerales) {
      const dg = consolidatedDetails.datosGenerales;
      const ampereJson = dg.ampereEmpalme ? JSON.stringify(dg.ampereEmpalme) : null;
      
      await client.query(
        `INSERT INTO datos_generales (
          planning_id, tipo_estructura, tipo_contenedor, tipo_empalme, ampere_empalme,
          capacidad_proteccion, numero_medidor, lectura_consumo,
          foto_estructura_uri, foto_fuera_contenedor_uri, foto_medidor_uri, foto_sector_medidor_uri
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (planning_id) DO UPDATE SET
          tipo_estructura = EXCLUDED.tipo_estructura,
          tipo_contenedor = EXCLUDED.tipo_contenedor,
          tipo_empalme = EXCLUDED.tipo_empalme,
          ampere_empalme = EXCLUDED.ampere_empalme,
          capacidad_proteccion = EXCLUDED.capacidad_proteccion,
          numero_medidor = EXCLUDED.numero_medidor,
          lectura_consumo = EXCLUDED.lectura_consumo,
          foto_estructura_uri = EXCLUDED.foto_estructura_uri,
          foto_fuera_contenedor_uri = EXCLUDED.foto_fuera_contenedor_uri,
          foto_medidor_uri = EXCLUDED.foto_medidor_uri,
          foto_sector_medidor_uri = EXCLUDED.foto_sector_medidor_uri`,
        [
          req.params.id,
          dg.tipoEstructura || null,
          dg.tipoContenedor || null,
          dg.tipoEmpalme || null,
          ampereJson,
          dg.capacidadProteccion || null,
          dg.numeroMedidor || null,
          dg.lecturaConsumo || null,
          dg.fotoEstructura || null,
          dg.fotoFueraContenedor || null,
          dg.fotoMedidor || null,
          dg.fotoSectorMedidor || null
        ]
      );
    }

    // 3.3 Apagado Equipos (3G / RRU)
    if (consolidatedDetails.apagado3G) {
      const ap = consolidatedDetails.apagado3G;
      const seAp3G = ap.seApagara3G === 'Si' || ap.seApagara3G === true;
      const seRet3G = ap.seRetirara3G === 'Si' || ap.seRetirara3G === true;
      const seApRRU = ap.seApagaraRRU === 'Si' || ap.seApagaraRRU === true;

      await client.query(
        `INSERT INTO apagado_equipos (
          planning_id, estado_inicial_3g, se_apagara_3g, se_retirara_3g,
          foto_equipo_3g_enc_uri, foto_breaker_3g_enc_uri, foto_equipo_3g_apag_uri, foto_breaker_3g_apag_uri, foto_espacio_retirado_uri,
          estado_inicial_rru, se_apagara_rru, foto_rru_enc_uri, foto_rru_apag_uri
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (planning_id) DO UPDATE SET
          estado_inicial_3g = EXCLUDED.estado_inicial_3g,
          se_apagara_3g = EXCLUDED.se_apagara_3g,
          se_retirara_3g = EXCLUDED.se_retirara_3g,
          foto_equipo_3g_enc_uri = EXCLUDED.foto_equipo_3g_enc_uri,
          foto_breaker_3g_enc_uri = EXCLUDED.foto_breaker_3g_enc_uri,
          foto_equipo_3g_apag_uri = EXCLUDED.foto_equipo_3g_apag_uri,
          foto_breaker_3g_apag_uri = EXCLUDED.foto_breaker_3g_apag_uri,
          foto_espacio_retirado_uri = EXCLUDED.foto_espacio_retirado_uri,
          estado_inicial_rru = EXCLUDED.estado_inicial_rru,
          se_apagara_rru = EXCLUDED.se_apagara_rru,
          foto_rru_enc_uri = EXCLUDED.foto_rru_enc_uri,
          foto_rru_apag_uri = EXCLUDED.foto_rru_apag_uri`,
        [
          req.params.id,
          ap.estado3G || null,
          seAp3G,
          seRet3G,
          ap.fotoEquipo3GEncendido || null,
          ap.fotoBreaker3GEncendido || null,
          ap.fotoEquipo3GApagado || null,
          ap.fotoBreaker3GApagado || null,
          ap.fotoEspacioRetirado || null,
          ap.estadoRRU || null,
          seApRRU,
          ap.fotoRRUEncendido || null,
          ap.fotoRRUApagado || null
        ]
      );
    }

    // 3.4 Apagado BAFI
    const hasBafi = consolidatedDetails.apagadoBafiSector1 || consolidatedDetails.apagadoBafiSector2 || consolidatedDetails.apagadoBafiSector3;
    if (hasBafi) {
      const b1 = consolidatedDetails.apagadoBafiSector1 || {};
      const b2 = consolidatedDetails.apagadoBafiSector2 || {};
      const b3 = consolidatedDetails.apagadoBafiSector3 || {};
      
      const a1 = consolidatedDetails.apagadoAntenaSector1 || {};

      const sectoresStr = [
        b1.estadoBasebandSector1 ? 'S1' : '',
        b2.estadoBasebandSector2 ? 'S2' : '',
        b3.estadoBasebandSector3 ? 'S3' : ''
      ].filter(Boolean).join('-');

      await client.query(
        `INSERT INTO apagado_bafi (
          planning_id, sectores, estado_inicial_antenas, se_apagaran_antenas,
          foto_antenas_enc_uri, foto_antenas_apag_uri,
          estado_inicial_baseband, se_apagara_baseband,
          foto_baseband_enc_uri, foto_baseband_apag_uri,
          confirmacion_apagado, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (planning_id) DO UPDATE SET
          sectores = EXCLUDED.sectores,
          estado_inicial_antenas = EXCLUDED.estado_inicial_antenas,
          se_apagaran_antenas = EXCLUDED.se_apagaran_antenas,
          foto_antenas_enc_uri = EXCLUDED.foto_antenas_enc_uri,
          foto_antenas_apag_uri = EXCLUDED.foto_antenas_apag_uri,
          estado_inicial_baseband = EXCLUDED.estado_inicial_baseband,
          se_apagara_baseband = EXCLUDED.se_apagara_baseband,
          foto_baseband_enc_uri = EXCLUDED.foto_baseband_enc_uri,
          foto_baseband_apag_uri = EXCLUDED.foto_baseband_apag_uri,
          confirmacion_apagado = EXCLUDED.confirmacion_apagado,
          observaciones = EXCLUDED.observaciones`,
        [
          req.params.id,
          sectoresStr || 'S1-S2-S3',
          a1.estadoAntenaSector1 || null,
          a1.seApagaraAntenaS1 === 'Si',
          a1.fotoBreakerAntenaS1Encendido || null,
          a1.fotoBreakerAntenaS1Apagado || null,
          b1.estadoBasebandSector1 || null,
          b1.confirmadoApagadoRetirar || false,
          b1.fotoBaseband1Encendida || null,
          b1.fotoBreakerBaseband1Apagado || null,
          b1.confirmadoApagadoRetirar || false,
          null
        ]
      );
    }

    // 3.5 Fotos a la tabla 'photos'
    const photosToInsert = [];

    const addPhoto = (uri, category) => {
      if (uri && typeof uri === 'string' && uri.trim()) {
        photosToInsert.push({ uri, category });
      }
    };

    const addPhotosArray = (arr, category) => {
      if (Array.isArray(arr)) {
        arr.forEach(uri => addPhoto(uri, category));
      }
    };

    if (consolidatedDetails.hallazgos) {
      addPhotosArray(consolidatedDetails.hallazgos.fotos, 'hallazgos');
    }
    if (consolidatedDetails.datosGenerales) {
      const dg = consolidatedDetails.datosGenerales;
      addPhoto(dg.fotoEstructura, 'sitio_general');
      addPhoto(dg.fotoFueraContenedor, 'interior_contenedor');
      addPhoto(dg.fotoMedidor, 'medidor');
      addPhoto(dg.fotoSectorMedidor, 'medidor');
      addPhotosArray(dg.fotosEmpalme, 'empalme');
      addPhotosArray(dg.fotosGeneralesSitio, 'sitio_general');
      addPhotosArray(dg.fotosInteriorContenedor, 'interior_contenedor');
    }
    if (consolidatedDetails.apagado3G) {
      const ap = consolidatedDetails.apagado3G;
      addPhoto(ap.fotoEquipo3GEncendido, 'apagado_3g');
      addPhoto(ap.fotoBreaker3GEncendido, 'apagado_3g');
      addPhoto(ap.fotoBreaker3GApagado, 'apagado_3g');
      addPhoto(ap.fotoEquipo3GApagado, 'apagado_3g');
      addPhoto(ap.fotoEspacioRetirado, 'apagado_3g');
      addPhoto(ap.fotoRRUEncendido, 'rru');
      addPhoto(ap.fotoRRUApagado, 'rru');
    }
    if (consolidatedDetails.apagadoBafiSector1) {
      const b = consolidatedDetails.apagadoBafiSector1;
      addPhoto(b.fotoBreakerBaseband1Encendido, 'apagado_bafi');
      addPhoto(b.fotoBaseband1Encendida, 'apagado_bafi');
      addPhoto(b.fotoBreakerBaseband1Apagado, 'apagado_bafi');
      addPhoto(b.fotoEspacioBaseband1Retirada, 'apagado_bafi');
      addPhotosArray(b.fotosConsumoFinal, 'apagado_bafi');
    }
    if (consolidatedDetails.apagadoBafiSector2) {
      const b = consolidatedDetails.apagadoBafiSector2;
      addPhoto(b.fotoBreakerBaseband2Encendido, 'apagado_bafi');
      addPhoto(b.fotoBaseband2Encendida, 'apagado_bafi');
      addPhoto(b.fotoBreakerBaseband2Apagado, 'apagado_bafi');
      addPhoto(b.fotoEspacioBaseband2Retirada, 'apagado_bafi');
      addPhotosArray(b.fotosConsumoFinal, 'apagado_bafi');
    }
    if (consolidatedDetails.apagadoBafiSector3) {
      const b = consolidatedDetails.apagadoBafiSector3;
      addPhoto(b.fotoBreakerBaseband3Encendido, 'apagado_bafi');
      addPhoto(b.fotoBaseband3Encendida, 'apagado_bafi');
      addPhoto(b.fotoBreakerBaseband3Apagado, 'apagado_bafi');
      addPhoto(b.fotoEspacioBaseband3Retirada, 'apagado_bafi');
    }
    if (consolidatedDetails.apagadoAntenaSector1) {
      const a = consolidatedDetails.apagadoAntenaSector1;
      addPhoto(a.fotoBreakerAntenaS1Encendido, 'apagado_bafi');
      addPhoto(a.fotoBreakerAntenaS1Apagado, 'apagado_bafi');
      addPhoto(a.fotoConsumoInicialCc, 'apagado_bafi');
      addPhoto(a.fotoConsumoFinalCc, 'apagado_bafi');
      addPhotosArray(a.fotosConsumoFinal, 'apagado_bafi');
    }
    if (consolidatedDetails.apagadoAntenaSector2) {
      const a = consolidatedDetails.apagadoAntenaSector2;
      addPhoto(a.fotoBreakerAntenaS2Encendido, 'apagado_bafi');
      addPhoto(a.fotoBreakerAntenaS2Apagado, 'apagado_bafi');
      addPhoto(a.fotoConsumoInicialCc, 'apagado_bafi');
      addPhoto(a.fotoConsumoFinalCc, 'apagado_bafi');
      addPhotosArray(a.fotosConsumoFinal, 'apagado_bafi');
    }
    if (consolidatedDetails.apagadoAntenaSector3) {
      const a = consolidatedDetails.apagadoAntenaSector3;
      addPhoto(a.fotoBreakerAntenaS3Encendido, 'apagado_bafi');
      addPhoto(a.fotoBreakerAntenaS3Apagado, 'apagado_bafi');
      addPhoto(a.fotoConsumoInicialCc, 'apagado_bafi');
      addPhoto(a.fotoConsumoFinalCc, 'apagado_bafi');
      addPhotosArray(a.fotosConsumoFinal, 'apagado_bafi');
    }
    if (consolidatedDetails.cambioChapa) {
      const cc = consolidatedDetails.cambioChapa;
      addPhoto(cc.fotoChapaAnterior, 'cambio_chapa');
      addPhoto(cc.fotoNuevaChapa, 'cambio_chapa');
      addPhoto(cc.fotoLlaveProgramacion, 'cambio_chapa');
      addPhoto(cc.fotoPuertaCerrada, 'cambio_chapa');
    }
    if (consolidatedDetails.evidenciaSalida) {
      const ev = consolidatedDetails.evidenciaSalida;
      addPhoto(ev.fotoRectificador, 'evidencia_salida');
      addPhoto(ev.fotoContenedor1, 'evidencia_salida');
      addPhoto(ev.fotoContenedor2, 'evidencia_salida');
      addPhoto(ev.fotoSitio1, 'evidencia_salida');
      addPhoto(ev.fotoSitio2, 'evidencia_salida');
      addPhoto(ev.fotoEstructuraSalida, 'evidencia_salida');
    }
    if (consolidatedDetails.alarmasExternas) {
      const al = consolidatedDetails.alarmasExternas;
      addPhoto(al.fotoAlarmasOVP, 'alarmas_externas');
      addPhoto(al.fotoAlarmasEquipos, 'alarmas_externas');
      addPhoto(al.fotoAlarmasMigradas, 'alarmas_externas');
      addPhoto(al.fotoAlarmasFinalesOVP, 'alarmas_externas');
      addPhoto(al.fotoNoImplementacion, 'alarmas_externas');
      addPhoto(al.fotoAlarmasImplementadas, 'alarmas_externas');
    }

    if (photosToInsert.length > 0) {
      await client.query('DELETE FROM photos WHERE planning_id = $1', [req.params.id]);
      for (const p of photosToInsert) {
        await client.query(
          `INSERT INTO photos (planning_id, category, uri, captured_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [req.params.id, p.category, p.uri]
        );
      }
    }

    // 4. Actualizar estado de sitio en cascada
    if (statusVal === 'Ejecutado') {
      const siteId = plUpdate.rows[0].site_id;
      await client.query(
        `UPDATE sites SET estado_excel = 'Ejecutado' WHERE id = $1`,
        [siteId]
      );
    } else if (statusVal === 'En ejecución') {
      const siteId = plUpdate.rows[0].site_id;
      await client.query(
        `UPDATE sites SET estado_excel = 'En ejecución' WHERE id = $1`,
        [siteId]
      );
    }

    const finalPlRes = await client.query('SELECT * FROM plannings WHERE id = $1', [req.params.id]);
    const finalPl = finalPlRes.rowCount > 0 ? finalPlRes.rows[0] : plUpdate.rows[0];

    await client.query('COMMIT');
    res.json({ success: true, data: finalPl });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
