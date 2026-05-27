#!/usr/bin/env node
/**
 * Script de Migración: sitesData.ts → PostgreSQL
 * Ejecutar: node scripts/migrate.js
 * 
 * Lee los sitios desde sitesData, los usuarios y planificaciones
 * de mockData y los inserta masivamente en PostgreSQL.
 */

const { Pool } = require('pg');
const path     = require('path');
const fs       = require('fs');

// Configuración de la base de datos
// En macOS con Homebrew, PostgreSQL usa el usuario del sistema sin contraseña
const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'proyectosapp_db',
  user:     process.env.DB_USER || process.env.USER || 'fernandoaldao',
  password: process.env.DB_PASSWORD || '',
});

// ── Datos de Usuarios (de mockData.ts) ──────────────────────
const USERS = [
  { id: 'u1', name: 'Juan Pérez',     email: 'juan.perez@empresa.com',    phone: '+56 9 1234 5678', company: 'TechCorp',          role: 'Administrador', status: 'Activo' },
  { id: 'u2', name: 'María González', email: 'maria.g@empresa.com',        phone: '+56 9 8765 4321', company: 'TechCorp',          role: 'Coordinador',   status: 'Activo' },
  { id: 'u3', name: 'Carlos Silva',   email: 'carlos.s@empresa.com',       phone: '+56 9 1122 3344', company: 'Contratistas Ltda', role: 'Trabajador',    status: 'Activo' },
  { id: 'u4', name: 'Ana López',      email: 'ana.lopez@empresa.com',      phone: '+56 9 4433 2211', company: 'Contratistas Ltda', role: 'Trabajador',    status: 'Activo' },
  { id: 'u5', name: 'Fernando Aldao', email: 'aldao.fernando@gmail.com',   phone: '+56957897940',    company: 'F1+',               role: 'Coordinador',   status: 'Activo' },
  { id: 'u6', name: 'Diego Quezada',  email: 'diego.quezada@f1.services',  phone: '+56934211740',    company: 'F1+',               role: 'Trabajador',    status: 'Activo' },
];

// ── Planificaciones (de mockData.ts) ─────────────────────────
const today = new Date().toISOString().split('T')[0];
const PLANNINGS = [
  { id: 'p1',  siteId: 'SA812', workerId: 'u3', date: '2026-05-18', status: 'En ejecución', startTime: '2026-05-18T10:00:00.000Z' },
  { id: 'p2',  siteId: 'SA241', workerId: 'u3', date: '2026-05-11', status: 'Ejecutado',    startTime: '2026-05-13T21:00:00.000Z', endTime: '2026-05-13T21:15:00.000Z' },
  { id: 'p3',  siteId: 'RM518', workerId: 'u4', date: '2026-05-19', status: 'Ejecutado',    startTime: '2026-05-19T12:00:00.000Z', endTime: '2026-05-19T12:41:00.000Z' },
  { id: 'p4',  siteId: 'RM518', workerId: 'u3', date: '2026-05-12', status: 'Planificado' },
  { id: 'p5',  siteId: 'RS153', workerId: 'u3', date: '2026-05-12', status: 'Planificado' },
  { id: 'p6',  siteId: 'SA331', workerId: 'u3', date: '2026-05-12', status: 'Planificado' },
  { id: 'p7',  siteId: 'SA935', workerId: 'u3', date: '2026-05-12', status: 'Planificado' },
  { id: 'p8',  siteId: 'SA288', workerId: 'u3', date: '2026-05-14', status: 'Planificado' },
  { id: 'p9',  siteId: 'FG084', workerId: 'u3', date: '2026-05-14', status: 'Planificado' },
  { id: 'p10', siteId: 'RM594', workerId: 'u3', date: '2026-05-14', status: 'Planificado' },
  { id: 'p11', siteId: 'FG085', workerId: 'u3', date: '2026-05-14', status: 'Planificado' },
  { id: 'p12', siteId: 'RS395', workerId: 'u3', date: '2026-05-13', status: 'Planificado' },
  { id: 'p13', siteId: 'RS876', workerId: 'u3', date: '2026-05-13', status: 'Planificado' },
  { id: 'p14', siteId: 'FN698', workerId: 'u5', date: '2026-05-19', status: 'En ejecución', startTime: '2026-05-19T12:31:00.000Z' },
  { id: 'p15', siteId: 'SA920', workerId: 'u5', date: '2026-05-20', status: 'Planificado' },
  { id: 'p16', siteId: 'SA792', workerId: 'u3', date: '2026-05-19', status: 'Planificado' },
  { id: 'p17', siteId: 'AS228', workerId: 'u4', date: '2026-05-19', status: 'Planificado' },
  { id: 'p18', siteId: 'RM518', workerId: 'u4', date: '2026-05-19', status: 'Planificado' },
  { id: 'p19', siteId: 'RS153', workerId: 'u4', date: '2026-05-19', status: 'Planificado' },
  { id: 'p20', siteId: 'SA121', workerId: 'u5', date: '2026-05-21', status: 'Planificado' },
  { id: 'p21', siteId: 'AS228', workerId: 'u5', date: '2026-05-20', status: 'Planificado' },
  { id: 'p22', siteId: 'FN707', workerId: 'u5', date: today,        status: 'Planificado' },
  { id: 'p23', siteId: 'AM790', workerId: 'u6', date: today,        status: 'Planificado' },
  { id: 'p24', siteId: 'AS070', workerId: 'u6', date: today,        status: 'Planificado' },
];

// ── Función principal de migración ───────────────────────────
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('\n🚀 Iniciando migración a PostgreSQL...\n');
    await client.query('BEGIN');

    // 1. Leer sitesData desde el archivo JSON generado
    console.log('📍 Leyendo sitios desde sitesData.ts...');
    const sitesJsonPath = path.join(__dirname, '../src/data/sitesData.json');
    let sitesData = [];

    if (fs.existsSync(sitesJsonPath)) {
      sitesData = JSON.parse(fs.readFileSync(sitesJsonPath, 'utf-8'));
      console.log(`   → ${sitesData.length} sitios encontrados en sitesData.json`);
    } else {
      console.log('   ⚠️  No se encontró sitesData.json, usando datos del seed.sql');
    }

    // 2. Migrar Usuarios
    console.log('\n👥 Migrando usuarios...');
    for (const u of USERS) {
      await client.query(
        `INSERT INTO users (id, name, email, phone, company, role, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           name=$2, email=$3, phone=$4, company=$5, role=$6, status=$7`,
        [u.id, u.name, u.email, u.phone, u.company, u.role, u.status]
      );
    }
    console.log(`   ✅ ${USERS.length} usuarios migrados`);

    // 3. Migrar Sitios (desde JSON si existe, sino desde planificaciones)
    if (sitesData.length > 0) {
      console.log(`\n🏗️  Migrando ${sitesData.length} sitios...`);
      let count = 0;
      for (const s of sitesData) {
        await client.query(
          `INSERT INTO sites (id, code, name, commune, address, latitude, longitude, region, estado_excel, proyecto, apagado_bafi)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET
             name=$3, commune=$4, address=$5, latitude=$6, longitude=$7,
             region=$8, estado_excel=$9, proyecto=$10, apagado_bafi=$11`,
          [
            s.id, s.code || s.id, s.name,
            s.commune || null, s.address || null,
            s.lat || null, s.lng || null,
            s.region || null,
            s.estadoExcel || 'Sin asignar',
            s.proyecto || null,
            s.apagadoBAFI === 'SI',
          ]
        );
        count++;
        if (count % 50 === 0) process.stdout.write(`   → ${count}/${sitesData.length}...\n`);
      }
      console.log(`   ✅ ${count} sitios migrados`);
    }

    // 4. Migrar Planificaciones
    console.log('\n📅 Migrando planificaciones...');
    for (const p of PLANNINGS) {
      // Verificar que el sitio existe antes de insertar
      const siteExists = await client.query('SELECT id FROM sites WHERE id = $1', [p.siteId]);
      if (!siteExists.rowCount) {
        console.log(`   ⚠️  Sitio ${p.siteId} no encontrado, saltando planificación ${p.id}`);
        continue;
      }

      await client.query(
        `INSERT INTO plannings (id, site_id, worker_id, status, scheduled_date, start_time, end_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           status=$4, start_time=$6, end_time=$7`,
        [
          p.id, p.siteId, p.workerId, p.status, p.date,
          p.startTime || null, p.endTime || null
        ]
      );
    }
    console.log(`   ✅ ${PLANNINGS.length} planificaciones migradas`);

    // 5. Datos de ejecución de p2
    console.log('\n📊 Migrando datos de ejecución (p2)...');
    await client.query(
      `INSERT INTO hallazgos (planning_id, observaciones)
       VALUES ('p2', 'Todo en orden, sin hallazgos críticos.')
       ON CONFLICT DO NOTHING`
    );

    await client.query(
      `INSERT INTO datos_generales (
         planning_id, tipo_estructura, tipo_contenedor, tipo_empalme,
         ampere_empalme, capacidad_proteccion, numero_medidor, lectura_consumo,
         foto_estructura_uri, foto_fuera_contenedor_uri, foto_medidor_uri, foto_sector_medidor_uri
       ) VALUES ('p2','Ventilada','Baterías Internas','Trifásico',
         '["12.50","13.20","12.80"]','40A','88776655','1540.5',
         'https://picsum.photos/id/11/400/300','https://picsum.photos/id/12/400/300',
         'https://picsum.photos/id/20/400/300','https://picsum.photos/id/21/400/300')
       ON CONFLICT DO NOTHING`
    );

    await client.query(
      `INSERT INTO photos (planning_id, category, uri) VALUES
        ('p2','hallazgos',           'https://picsum.photos/id/10/400/300'),
        ('p2','sitio_general',       'https://picsum.photos/id/13/400/300'),
        ('p2','sitio_general',       'https://picsum.photos/id/14/400/300'),
        ('p2','interior_contenedor', 'https://picsum.photos/id/15/400/300'),
        ('p2','interior_contenedor', 'https://picsum.photos/id/16/400/300'),
        ('p2','empalme',             'https://picsum.photos/id/17/400/300'),
        ('p2','empalme',             'https://picsum.photos/id/18/400/300'),
        ('p2','empalme',             'https://picsum.photos/id/19/400/300')
       ON CONFLICT DO NOTHING`
    );
    console.log('   ✅ Datos de ejecución migrados');

    await client.query('COMMIT');

    // Resumen final
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)         AS usuarios,
        (SELECT COUNT(*) FROM sites)         AS sitios,
        (SELECT COUNT(*) FROM plannings)     AS planificaciones,
        (SELECT COUNT(*) FROM photos)        AS fotos
    `);
    const c = counts.rows[0];
    console.log('\n✅ ¡Migración completada exitosamente!');
    console.log('─────────────────────────────────────');
    console.log(`   👥 Usuarios:          ${c.usuarios}`);
    console.log(`   🏗️  Sitios:            ${c.sitios}`);
    console.log(`   📅 Planificaciones:   ${c.planificaciones}`);
    console.log(`   📸 Fotos:             ${c.fotos}`);
    console.log('─────────────────────────────────────\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error en la migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
