import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'proyectos.db';

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // 1. Tabla de Sitios
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      commune TEXT,
      address TEXT,
      latitude REAL,
      longitude REAL
    );
  `);

  // 2. Tabla de Planificaciones (Actividades)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS plannings (
      id TEXT PRIMARY KEY,
      site_id TEXT REFERENCES sites(id),
      status TEXT DEFAULT 'Planificado',
      scheduled_date TEXT,
      worker_name TEXT,
      worker_id TEXT,
      observations TEXT,
      start_time TEXT,
      end_time TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Tabla de Datos Generales (Detalle Técnico)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS datos_generales (
      planning_id TEXT PRIMARY KEY REFERENCES plannings(id),
      tipo_estructura TEXT,
      tipo_contenedor TEXT,
      tipo_empalme TEXT,
      capacidad_proteccion TEXT,
      numero_medidor TEXT,
      lectura_consumo TEXT,
      foto_estructura_uri TEXT,
      foto_fuera_contenedor_uri TEXT,
      foto_medidor_uri TEXT,
      foto_sector_medidor_uri TEXT
    );
  `);

  // 4. Tabla de Apagado de Equipos (3G / RRU)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS apagado_equipos (
      planning_id TEXT PRIMARY KEY REFERENCES plannings(id),
      estado_inicial_3g TEXT,
      se_apagara_3g TEXT,
      se_retirara_3g TEXT,
      estado_inicial_rru TEXT,
      se_apagara_rru TEXT,
      foto_equipo_encendido_uri TEXT,
      foto_breaker_encendido_uri TEXT,
      foto_equipo_apagado_uri TEXT,
      foto_breaker_apagado_uri TEXT,
      foto_espacio_retirado_uri TEXT
    );
  `);

  // 5. Tabla de Fotos (Múltiples fotos por campo)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planning_id TEXT REFERENCES plannings(id),
      category TEXT, 
      uri TEXT,
      latitude REAL,
      longitude REAL,
      timestamp TEXT,
      captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seeding de datos iniciales si la tabla sites está vacía
  const sitesCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sites');
  if (sitesCount?.count === 0) {
    console.log('Seeding initial data...');
    await db.runAsync(`
      INSERT INTO sites (id, code, name, commune, address, latitude, longitude) VALUES 
      ('1', 'SCL001', 'Cerro Navia Centro', 'Cerro Navia', 'Av. Jose Joaquin Perez 6500', -33.4300, -70.7400),
      ('2', 'SCL002', 'Maipú Plaza', 'Maipú', 'Pajaritos 1200', -33.5100, -70.7500);
    `);

    await db.runAsync(`
      INSERT INTO plannings (id, site_id, status, scheduled_date, worker_name, worker_id) VALUES 
      ('p1', '1', 'Planificado', '2026-05-10', 'Fernando Aldao', 'ID-8844');
    `);
  }

  console.log('Database initialized successfully');
  return db;
};

export const getDb = () => SQLite.openDatabaseAsync(DATABASE_NAME);
