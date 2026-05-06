-- Esquema de Base de Datos para Mobile Projects App

-- 1. Tabla de Sitios
CREATE TABLE sites (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    commune VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

-- 2. Tabla de Planificaciones (Actividades)
CREATE TABLE plannings (
    id VARCHAR(50) PRIMARY KEY,
    site_id VARCHAR(50) REFERENCES sites(id),
    status VARCHAR(20) DEFAULT 'Planificado', -- Planificado, Ejecutando, Finalizado
    scheduled_date DATE,
    worker_name VARCHAR(100),
    worker_id VARCHAR(50),
    observations TEXT, -- Hallazgos previos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Datos Generales (Detalle Técnico)
CREATE TABLE datos_generales (
    planning_id VARCHAR(50) PRIMARY KEY REFERENCES plannings(id),
    tipo_estructura VARCHAR(50),
    tipo_contenedor VARCHAR(50),
    tipo_empalme VARCHAR(20),
    capacidad_proteccion VARCHAR(50),
    numero_medidor VARCHAR(50),
    lectura_consumo VARCHAR(50),
    foto_estructura_uri TEXT,
    foto_fuera_contenedor_uri TEXT,
    foto_medidor_uri TEXT,
    foto_sector_medidor_uri TEXT
);

-- 4. Tabla de Apagado de Equipos (3G / RRU)
CREATE TABLE apagado_equipos (
    planning_id VARCHAR(50) PRIMARY KEY REFERENCES plannings(id),
    estado_inicial_3g VARCHAR(20),
    se_apagara_3g VARCHAR(5),
    se_retirara_3g VARCHAR(5),
    estado_inicial_rru VARCHAR(20),
    se_apagara_rru VARCHAR(5),
    foto_equipo_encendido_uri TEXT,
    foto_breaker_encendido_uri TEXT,
    foto_equipo_apagado_uri TEXT,
    foto_breaker_apagado_uri TEXT,
    foto_espacio_retirado_uri TEXT
);

-- 5. Tabla de Fotos (Para manejar múltiples fotos por campo si es necesario)
CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planning_id VARCHAR(50) REFERENCES plannings(id),
    category VARCHAR(50), -- hallazgos, sitio_general, interior_contenedor, empalme
    uri TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timestamp TIMESTAMP,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INSERT DE PRUEBA (DATA INICIAL)
INSERT INTO sites (id, code, name, commune, address, latitude, longitude) VALUES 
('1', 'SCL001', 'Cerro Navia Centro', 'Cerro Navia', 'Av. Jose Joaquin Perez 6500', -33.4300, -70.7400),
('2', 'SCL002', 'Maipú Plaza', 'Maipú', 'Pajaritos 1200', -33.5100, -70.7500);

INSERT INTO plannings (id, site_id, status, scheduled_date, worker_name, worker_id) VALUES 
('p1', '1', 'Planificado', '2026-05-10', 'Fernando Aldao', 'ID-8844');
