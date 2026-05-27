-- ============================================================
-- ESQUEMA COMPLETO PostgreSQL — ProyectosApp
-- Base de datos: proyectosapp_db
-- Versión: 1.0
-- ============================================================

-- Limpiar tablas si ya existen (para re-ejecución segura)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS hallazgos CASCADE;
DROP TABLE IF EXISTS apagado_bafi CASCADE;
DROP TABLE IF EXISTS apagado_equipos CASCADE;
DROP TABLE IF EXISTS datos_generales CASCADE;
DROP TABLE IF EXISTS plannings CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- ============================================================
-- 1. TABLA: users
-- Trabajadores y coordinadores de la aplicación
-- ============================================================
CREATE TABLE users (
    id          VARCHAR(50)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    phone       VARCHAR(30),
    company     VARCHAR(100),
    role        VARCHAR(30)  NOT NULL CHECK (role IN ('Administrador', 'Coordinador', 'Trabajador')),
    photo_url   TEXT,
    status      VARCHAR(20)  DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo')),
    latitude    DECIMAL(10, 7),
    longitude   DECIMAL(10, 7),
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. TABLA: sites
-- Sitios de telecomunicaciones
-- ============================================================
CREATE TABLE sites (
    id              VARCHAR(50)  PRIMARY KEY,
    code            VARCHAR(20)  NOT NULL,
    name            VARCHAR(150) NOT NULL,
    commune         VARCHAR(100),
    address         TEXT,
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    region          INTEGER,
    estado_excel    VARCHAR(50)  DEFAULT 'Sin asignar',
    proyecto        VARCHAR(100),
    apagado_bafi    BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. TABLA: plannings
-- Planificaciones de visitas/actividades por sitio y trabajador
-- ============================================================
CREATE TABLE plannings (
    id              VARCHAR(50)  PRIMARY KEY,
    site_id         VARCHAR(50)  NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    worker_id       VARCHAR(50)  REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(30)  DEFAULT 'Planificado'
                                 CHECK (status IN ('Planificado', 'En ejecución', 'Ejecutado', 'Cancelado')),
    scheduled_date  DATE         NOT NULL,
    start_time      TIMESTAMP,
    end_time        TIMESTAMP,
    observations    TEXT,
    created_by      VARCHAR(50)  REFERENCES users(id),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. TABLA: hallazgos
-- Observaciones y hallazgos previos al trabajo
-- ============================================================
CREATE TABLE hallazgos (
    id              SERIAL       PRIMARY KEY,
    planning_id     VARCHAR(50)  NOT NULL REFERENCES plannings(id) ON DELETE CASCADE,
    observaciones   TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. TABLA: datos_generales
-- Datos técnicos recolectados en terreno (Estructura, Empalme, Medidor)
-- ============================================================
CREATE TABLE datos_generales (
    planning_id             VARCHAR(50)  PRIMARY KEY REFERENCES plannings(id) ON DELETE CASCADE,
    tipo_estructura         VARCHAR(50),
    tipo_contenedor         VARCHAR(50),
    tipo_empalme            VARCHAR(20)  CHECK (tipo_empalme IN ('Monofásico', 'Bifásico', 'Trifásico')),
    ampere_empalme          TEXT,        -- JSON array de mediciones ej: ["12.5","13.2","12.8"]
    capacidad_proteccion    VARCHAR(50),
    numero_medidor          VARCHAR(50),
    lectura_consumo         VARCHAR(50),
    foto_estructura_uri     TEXT,
    foto_fuera_contenedor_uri TEXT,
    foto_medidor_uri        TEXT,
    foto_sector_medidor_uri TEXT,
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. TABLA: apagado_equipos
-- Registro de apagado de equipos 3G / RRU
-- ============================================================
CREATE TABLE apagado_equipos (
    planning_id             VARCHAR(50)  PRIMARY KEY REFERENCES plannings(id) ON DELETE CASCADE,
    -- 3G
    estado_inicial_3g       VARCHAR(20),
    se_apagara_3g           BOOLEAN,
    se_retirara_3g          BOOLEAN,
    foto_equipo_3g_enc_uri  TEXT,
    foto_breaker_3g_enc_uri TEXT,
    foto_equipo_3g_apag_uri TEXT,
    foto_breaker_3g_apag_uri TEXT,
    foto_espacio_retirado_uri TEXT,
    -- RRU
    estado_inicial_rru      VARCHAR(20),
    se_apagara_rru          BOOLEAN,
    foto_rru_enc_uri        TEXT,
    foto_rru_apag_uri       TEXT,
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. TABLA: apagado_bafi
-- Registro específico de apagado BAFI (Baseband)
-- ============================================================
CREATE TABLE apagado_bafi (
    planning_id             VARCHAR(50)  PRIMARY KEY REFERENCES plannings(id) ON DELETE CASCADE,
    -- Antenas / Sectores
    sectores                TEXT,        -- ej: "S1-S2-S3"
    estado_inicial_antenas  VARCHAR(20),
    se_apagaran_antenas     BOOLEAN,
    foto_antenas_enc_uri    TEXT,
    foto_antenas_apag_uri   TEXT,
    -- Baseband
    estado_inicial_baseband VARCHAR(20),
    se_apagara_baseband     BOOLEAN,
    foto_baseband_enc_uri   TEXT,
    foto_baseband_apag_uri  TEXT,
    -- Confirmación final
    confirmacion_apagado    BOOLEAN      DEFAULT FALSE,
    observaciones           TEXT,
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. TABLA: photos
-- Fotos capturadas en terreno con metadatos GPS
-- ============================================================
CREATE TABLE photos (
    id              SERIAL       PRIMARY KEY,
    planning_id     VARCHAR(50)  NOT NULL REFERENCES plannings(id) ON DELETE CASCADE,
    category        VARCHAR(50)  NOT NULL,  -- 'hallazgos', 'sitio_general', 'interior_contenedor',
                                             -- 'empalme', 'medidor', 'apagado_3g', 'apagado_bafi', 'rru'
    uri             TEXT         NOT NULL,
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    captured_at     TIMESTAMP,
    uploaded_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. TABLA: audit_log
-- Registro de auditoría de cambios en planificaciones
-- ============================================================
CREATE TABLE audit_log (
    id              SERIAL       PRIMARY KEY,
    table_name      VARCHAR(50)  NOT NULL,
    record_id       VARCHAR(50)  NOT NULL,
    action          VARCHAR(20)  NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by      VARCHAR(50)  REFERENCES users(id),
    changed_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    old_values      JSONB,
    new_values      JSONB
);

-- ============================================================
-- 10. TABLA: notifications
-- Notificaciones para trabajadores (ej: asignación/reapertura de sitio)
-- ============================================================
CREATE TABLE notifications (
    id              SERIAL       PRIMARY KEY,
    worker_id       VARCHAR(50)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50)  NOT NULL, -- 'planning_created', 'planning_reopened'
    message         TEXT         NOT NULL,
    is_read         BOOLEAN      DEFAULT FALSE,
    planning_id     VARCHAR(50)  REFERENCES plannings(id) ON DELETE CASCADE,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ÍNDICES para mejor performance
-- ============================================================
CREATE INDEX idx_plannings_site_id     ON plannings(site_id);
CREATE INDEX idx_notifications_worker  ON notifications(worker_id);
CREATE INDEX idx_plannings_worker_id   ON plannings(worker_id);
CREATE INDEX idx_plannings_status      ON plannings(status);
CREATE INDEX idx_plannings_date        ON plannings(scheduled_date);
CREATE INDEX idx_photos_planning_id    ON photos(planning_id);
CREATE INDEX idx_photos_category       ON photos(category);
CREATE INDEX idx_sites_code            ON sites(code);
CREATE INDEX idx_sites_proyecto        ON sites(proyecto);
CREATE INDEX idx_audit_record_id       ON audit_log(record_id);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tablas que tienen updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plannings_updated_at
    BEFORE UPDATE ON plannings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datos_generales_updated_at
    BEFORE UPDATE ON datos_generales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apagado_equipos_updated_at
    BEFORE UPDATE ON apagado_equipos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apagado_bafi_updated_at
    BEFORE UPDATE ON apagado_bafi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
