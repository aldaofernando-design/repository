-- ============================================================
-- SEED DATA — ProyectosApp
-- Datos iniciales basados en mockData.ts y sitesData.ts
-- ============================================================

-- ------------------------------------------------------------
-- USUARIOS
-- ------------------------------------------------------------
INSERT INTO users (id, name, email, phone, company, role, status) VALUES
  ('u1', 'Juan Pérez',     'juan.perez@empresa.com',      '+56 9 1234 5678', 'TechCorp',         'Administrador', 'Activo'),
  ('u2', 'María González', 'maria.g@empresa.com',          '+56 9 8765 4321', 'TechCorp',         'Coordinador',   'Activo'),
  ('u3', 'Carlos Silva',   'carlos.s@empresa.com',         '+56 9 1122 3344', 'Contratistas Ltda','Trabajador',    'Activo'),
  ('u4', 'Ana López',      'ana.lopez@empresa.com',        '+56 9 4433 2211', 'Contratistas Ltda','Trabajador',    'Activo'),
  ('u5', 'Fernando Aldao', 'aldao.fernando@gmail.com',     '+56957897940',    'F1+',              'Coordinador',   'Activo'),
  ('u6', 'Diego Quezada',  'diego.quezada@f1.services',   '+56934211740',    'F1+',              'Trabajador',    'Activo');

-- ------------------------------------------------------------
-- SITIOS (muestra representativa — el script migrate.js
-- carga la lista completa desde sitesData.ts)
-- ------------------------------------------------------------
INSERT INTO sites (id, code, name, commune, address, latitude, longitude, region, estado_excel, proyecto, apagado_bafi) VALUES
  ('AM790', 'AM790', 'Paradero 29 Reubicación',             'La Cisterna', 'Trinidad Ramirez N°0250',          -33.543192, -70.671128, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('AM849', 'AM849', 'Primavera - reubicación (Ex RM970)',  'La Pintana',  'Dr. Amador Neghme N° 02749',        -33.601672, -70.623272, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('SA812', 'SA812', 'Sitio SA812',                         'Santiago',    'Dirección SA812',                   -33.450000, -70.680000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('SA241', 'SA241', 'Sitio SA241',                         'Santiago',    'Dirección SA241',                   -33.460000, -70.670000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('RM518', 'RM518', 'Sitio RM518',                         'Maipú',       'Dirección RM518',                   -33.510000, -70.750000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('FN698', 'FN698', 'Sitio FN698',                         'Ñuñoa',       'Dirección FN698',                   -33.455000, -70.590000, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('AS070', 'AS070', 'Av. España - Batuco',                  'Batuco',      'Av. España s/n',                    -33.130000, -70.810000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('SA920', 'SA920', 'Sitio SA920',                         'Pudahuel',    'Dirección SA920',                   -33.430000, -70.770000, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('SA121', 'SA121', 'Sitio SA121',                         'Renca',       'Dirección SA121',                   -33.408000, -70.730000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('AS228', 'AS228', 'Sitio AS228',                         'Quilicura',   'Dirección AS228',                   -33.370000, -70.740000, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('FN707', 'FN707', 'Sitio FN707',                         'Las Condes',  'Dirección FN707',                   -33.408000, -70.577000, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('SA792', 'SA792', 'Sitio SA792',                         'Peñalolén',   'Dirección SA792',                   -33.492000, -70.575000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('RS153', 'RS153', 'Sitio RS153',                         'La Florida',  'Dirección RS153',                   -33.522000, -70.597000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('SA331', 'SA331', 'Sitio SA331',                         'La Granja',   'Dirección SA331',                   -33.536000, -70.624000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('SA935', 'SA935', 'Sitio SA935',                         'Pudahuel',    'Dirección SA935',                   -33.443000, -70.763000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('SA288', 'SA288', 'Sitio SA288',                         'Cerro Navia', 'Dirección SA288',                   -33.417000, -70.750000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('FG084', 'FG084', 'Sitio FG084',                         'Estación Cen','Dirección FG084',                   -33.453000, -70.668000, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('RM594', 'RM594', 'Sitio RM594',                         'Maipú',       'Dirección RM594',                   -33.510000, -70.769000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('FG085', 'FG085', 'Sitio FG085',                         'Quinta Normal','Dirección FG085',                  -33.433000, -70.704000, 13, 'Sin Asignar', 'Apagado BAFI', TRUE),
  ('RS395', 'RS395', 'Sitio RS395',                         'Macul',       'Dirección RS395',                   -33.488000, -70.600000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE),
  ('RS876', 'RS876', 'Sitio RS876',                         'San Miguel',  'Dirección RS876',                   -33.497000, -70.648000, 13, 'Sin Asignar', 'Apagado 3G',   FALSE);

-- ------------------------------------------------------------
-- PLANIFICACIONES
-- ------------------------------------------------------------
INSERT INTO plannings (id, site_id, worker_id, status, scheduled_date, start_time, end_time) VALUES
  ('p1',  'SA812', 'u3', 'En ejecución', '2026-05-18', '2026-05-18 10:00:00', NULL),
  ('p2',  'SA241', 'u3', 'Ejecutado',    '2026-05-11', '2026-05-13 21:00:00', '2026-05-13 21:15:00'),
  ('p3',  'RM518', 'u4', 'Ejecutado',    '2026-05-19', '2026-05-19 12:00:00', '2026-05-19 12:41:00'),
  ('p4',  'RM518', 'u3', 'Planificado',  '2026-05-12', NULL, NULL),
  ('p5',  'RS153', 'u3', 'Planificado',  '2026-05-12', NULL, NULL),
  ('p6',  'SA331', 'u3', 'Planificado',  '2026-05-12', NULL, NULL),
  ('p7',  'SA935', 'u3', 'Planificado',  '2026-05-12', NULL, NULL),
  ('p8',  'SA288', 'u3', 'Planificado',  '2026-05-14', NULL, NULL),
  ('p9',  'FG084', 'u3', 'Planificado',  '2026-05-14', NULL, NULL),
  ('p10', 'RM594', 'u3', 'Planificado',  '2026-05-14', NULL, NULL),
  ('p11', 'FG085', 'u3', 'Planificado',  '2026-05-14', NULL, NULL),
  ('p12', 'RS395', 'u3', 'Planificado',  '2026-05-13', NULL, NULL),
  ('p13', 'RS876', 'u3', 'Planificado',  '2026-05-13', NULL, NULL),
  ('p14', 'FN698', 'u5', 'En ejecución', '2026-05-19', '2026-05-19 12:31:00', NULL),
  ('p15', 'SA920', 'u5', 'Planificado',  '2026-05-20', NULL, NULL),
  ('p16', 'SA792', 'u3', 'Planificado',  '2026-05-19', NULL, NULL),
  ('p17', 'AS228', 'u4', 'Planificado',  '2026-05-19', NULL, NULL),
  ('p18', 'RM518', 'u4', 'Planificado',  '2026-05-19', NULL, NULL),
  ('p19', 'RS153', 'u4', 'Planificado',  '2026-05-19', NULL, NULL),
  ('p20', 'SA121', 'u5', 'Planificado',  '2026-05-21', NULL, NULL),
  ('p21', 'AS228', 'u5', 'Planificado',  '2026-05-20', NULL, NULL),
  ('p22', 'FN707', 'u5', 'Planificado',  CURRENT_DATE, NULL, NULL),
  ('p23', 'AM790', 'u6', 'Planificado',  CURRENT_DATE, NULL, NULL),
  ('p24', 'AS070', 'u6', 'Planificado',  CURRENT_DATE, NULL, NULL);

-- ------------------------------------------------------------
-- HALLAZGOS (planificación p2 ejecutada)
-- ------------------------------------------------------------
INSERT INTO hallazgos (planning_id, observaciones) VALUES
  ('p2', 'Todo en orden, sin hallazgos críticos.');

-- ------------------------------------------------------------
-- DATOS GENERALES (planificación p2 ejecutada con datos completos)
-- ------------------------------------------------------------
INSERT INTO datos_generales (
    planning_id, tipo_estructura, tipo_contenedor, tipo_empalme,
    ampere_empalme, capacidad_proteccion, numero_medidor, lectura_consumo,
    foto_estructura_uri, foto_fuera_contenedor_uri, foto_medidor_uri, foto_sector_medidor_uri
) VALUES (
    'p2', 'Ventilada', 'Baterías Internas', 'Trifásico',
    '["12.50","13.20","12.80"]', '40A', '88776655', '1540.5',
    'https://picsum.photos/id/11/400/300',
    'https://picsum.photos/id/12/400/300',
    'https://picsum.photos/id/20/400/300',
    'https://picsum.photos/id/21/400/300'
);

-- ------------------------------------------------------------
-- APAGADO EQUIPOS (planificación p2)
-- ------------------------------------------------------------
INSERT INTO apagado_equipos (
    planning_id,
    estado_inicial_3g, se_apagara_3g, se_retirara_3g,
    foto_equipo_3g_enc_uri, foto_breaker_3g_enc_uri,
    foto_equipo_3g_apag_uri, foto_breaker_3g_apag_uri,
    foto_espacio_retirado_uri,
    estado_inicial_rru, se_apagara_rru,
    foto_rru_enc_uri, foto_rru_apag_uri
) VALUES (
    'p2',
    'Encendido', TRUE, TRUE,
    'https://picsum.photos/id/22/400/300',
    'https://picsum.photos/id/23/400/300',
    'https://picsum.photos/id/25/400/300',
    'https://picsum.photos/id/24/400/300',
    'https://picsum.photos/id/26/400/300',
    'Encendido', TRUE,
    'https://picsum.photos/id/27/400/300',
    'https://picsum.photos/id/28/400/300'
);

-- ------------------------------------------------------------
-- FOTOS (planificación p2)
-- ------------------------------------------------------------
INSERT INTO photos (planning_id, category, uri) VALUES
  ('p2', 'hallazgos',            'https://picsum.photos/id/10/400/300'),
  ('p2', 'sitio_general',        'https://picsum.photos/id/13/400/300'),
  ('p2', 'sitio_general',        'https://picsum.photos/id/14/400/300'),
  ('p2', 'interior_contenedor',  'https://picsum.photos/id/15/400/300'),
  ('p2', 'interior_contenedor',  'https://picsum.photos/id/16/400/300'),
  ('p2', 'empalme',              'https://picsum.photos/id/17/400/300'),
  ('p2', 'empalme',              'https://picsum.photos/id/18/400/300'),
  ('p2', 'empalme',              'https://picsum.photos/id/19/400/300');
