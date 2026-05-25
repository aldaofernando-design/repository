# 🐘 ProyectosApp — Backend PostgreSQL

Backend REST API que expone la base de datos local PostgreSQL de ProyectosApp.

---

## Instalación Rápida

### Paso 1 — Instalar Homebrew + PostgreSQL (solo primera vez)

```bash
# Instalar Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar PostgreSQL 16
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Paso 2 — Setup automático (ejecutar desde la raíz del proyecto)

```bash
cd /Users/fernandoaldao/.gemini/antigravity/scratch/ProyectosApp
node backend/setup.js
```

Este comando hace todo automáticamente:
- ✅ Crea la base de datos `proyectosapp_db`
- ✅ Aplica el esquema de tablas
- ✅ Migra todos los datos de la app
- ✅ Instala dependencias del backend

### Paso 3 — Iniciar el backend

```bash
cd backend
npm start
```

---

## Endpoints API

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/` | Health check del servidor |
| GET | `/api/users` | Listar usuarios |
| GET | `/api/users/:id` | Detalle de usuario |
| POST | `/api/users` | Crear usuario |
| GET | `/api/sites` | Listar sitios |
| GET | `/api/sites?proyecto=BAFI` | Filtrar por proyecto |
| GET | `/api/sites/:id` | Detalle de sitio con planificaciones |
| GET | `/api/plannings` | Listar planificaciones |
| GET | `/api/plannings?status=Ejecutado` | Filtrar por estado |
| GET | `/api/plannings?worker_id=u6` | Planificaciones de un trabajador |
| GET | `/api/plannings/:id` | Detalle completo con todos los datos |
| POST | `/api/plannings` | Crear planificación |
| PUT | `/api/plannings/:id` | Actualizar planificación |
| GET | `/api/photos?planning_id=p2` | Fotos de una planificación |
| POST | `/api/photos` | Registrar foto |
| GET | `/api/reports/summary` | Resumen estadístico general |
| GET | `/api/reports/daily?date=2026-05-25` | Planificaciones del día |

---

## Estructura de archivos

```
backend/
├── server.js          # Servidor Express principal
├── db.js              # Conexión a PostgreSQL
├── setup.js           # Setup automático (ejecutar una vez)
├── package.json       # Dependencias
├── .env.example       # Variables de entorno (copiar a .env)
└── routes/
    ├── users.js       # CRUD usuarios
    ├── sites.js       # CRUD sitios
    ├── plannings.js   # CRUD planificaciones + detalle completo
    ├── photos.js      # CRUD fotos
    └── reports.js     # Reportes estadísticos

database/
├── schema_postgres.sql  # Esquema completo de PostgreSQL
└── seed.sql             # Datos iniciales

scripts/
└── migrate.js          # Script de migración de datos mock → PostgreSQL
```

---

## Configuración (.env)

Copia `.env.example` a `.env` dentro de `backend/`:

```bash
cp backend/.env.example backend/.env
```

---

## Consultas SQL útiles

```sql
-- Ver todos los sitios del proyecto BAFI
SELECT code, name, commune FROM sites WHERE proyecto LIKE '%BAFI%';

-- Ver planificaciones de hoy
SELECT p.id, s.code, s.name, u.name as trabajador, p.status
FROM plannings p
JOIN sites s ON p.site_id = s.id
JOIN users u ON p.worker_id = u.id
WHERE p.scheduled_date = CURRENT_DATE;

-- Resumen por trabajador
SELECT u.name, COUNT(p.id) as total,
       SUM(CASE WHEN p.status = 'Ejecutado' THEN 1 ELSE 0 END) as ejecutados
FROM plannings p
JOIN users u ON p.worker_id = u.id
GROUP BY u.name;
```
