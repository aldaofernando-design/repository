#!/usr/bin/env node
/**
 * Script de Setup completo de la base de datos
 * Ejecutar DESPUÉS de instalar PostgreSQL:
 *   node backend/setup.js
 * 
 * Este script:
 * 1. Crea el usuario y base de datos en PostgreSQL
 * 2. Aplica el esquema SQL completo
 * 3. Ejecuta la migración de datos
 */

const { execSync, exec } = require('child_process');
const fs   = require('fs');
const path = require('path');

const DB_NAME = 'proyectosapp_db';
const DB_USER = 'proyectosapp_user';
const DB_PASS = 'proyectos2026';

function run(cmd, ignoreError = false) {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
    return out.trim();
  } catch (e) {
    if (!ignoreError) {
      console.error(`   ⚠️  ${e.stderr?.trim() || e.message}`);
    }
    return null;
  }
}

async function setup() {
  console.log('\n🐘 ProyectosApp — Setup de Base de Datos PostgreSQL');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Verificar PostgreSQL
  console.log('1️⃣  Verificando PostgreSQL...');
  const pgVersion = run('psql --version', true);
  if (!pgVersion) {
    console.error('❌ PostgreSQL no está instalado o no está en el PATH.');
    console.error('   Por favor instala PostgreSQL con:');
    console.error('   brew install postgresql@16');
    console.error('   brew services start postgresql@16');
    console.error('   echo \'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"\' >> ~/.zshrc');
    console.error('   source ~/.zshrc\n');
    process.exit(1);
  }
  console.log(`   ✅ ${pgVersion}\n`);

  // 2. Crear usuario
  console.log(`2️⃣  Creando usuario '${DB_USER}'...`);
  run(`psql -U postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"`, true);
  run(`psql -U $(whoami) -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"`, true);
  console.log(`   ✅ Usuario configurado\n`);

  // 3. Crear base de datos
  console.log(`3️⃣  Creando base de datos '${DB_NAME}'...`);
  run(`createdb ${DB_NAME} 2>/dev/null || psql -U $(whoami) -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"`, true);
  run(`psql -U $(whoami) -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"`, true);
  console.log(`   ✅ Base de datos creada\n`);

  // 4. Aplicar esquema
  console.log('4️⃣  Aplicando esquema de tablas...');
  const schemaPath = path.join(__dirname, '../database/schema_postgres.sql');
  const result = run(`psql -U $(whoami) -d ${DB_NAME} -f "${schemaPath}"`, true);
  if (result !== null) {
    console.log('   ✅ Esquema aplicado correctamente\n');
  } else {
    console.log('   ⚠️  Revisa el esquema manualmente si hay errores\n');
  }

  // 5. Exportar sitesData a JSON para migración
  console.log('5️⃣  Exportando sitesData.ts a JSON...');
  const exportScript = `
    const { sitesData } = require('./src/data/sitesData');
    const fs = require('fs');
    // Convertir el módulo TypeScript a JSON plano
    fs.writeFileSync('./src/data/sitesData.json', JSON.stringify(sitesData, null, 2));
    console.log('   ✅ sitesData.json creado con', sitesData.length, 'sitios');
  `;
  fs.writeFileSync(path.join(__dirname, '../.tmp_export.js'), exportScript);
  // No podemos importar .ts directamente, usamos el JSON de sitios_v2.json si existe
  const sitiosV2Path = path.join(__dirname, '../src/data/sitios_v2.json');
  const sitesJsonPath = path.join(__dirname, '../src/data/sitesData.json');
  if (fs.existsSync(sitiosV2Path)) {
    const sitiosV2 = JSON.parse(fs.readFileSync(sitiosV2Path, 'utf-8'));
    // Normalizar al formato de sitesData
    const normalized = Array.isArray(sitiosV2) ? sitiosV2 : (sitiosV2.sitios || sitiosV2.data || []);
    fs.writeFileSync(sitesJsonPath, JSON.stringify(normalized, null, 2));
    console.log(`   ✅ ${normalized.length} sitios exportados a sitesData.json\n`);
  } else {
    console.log('   ⚠️  sitios_v2.json no encontrado, la migración usará los sitios del seed.sql\n');
  }
  fs.unlinkSync(path.join(__dirname, '../.tmp_export.js'));

  // 6. Ejecutar migración
  console.log('6️⃣  Ejecutando migración de datos...');
  try {
    execSync('node scripts/migrate.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: DB_NAME,
        DB_USER: process.env.USER || 'postgres',
        DB_PASSWORD: '',
      }
    });
  } catch (e) {
    console.error('   ❌ Error en migración. Ejecuta manualmente: node scripts/migrate.js');
  }

  // 7. Instalar dependencias del backend
  console.log('\n7️⃣  Instalando dependencias del backend...');
  execSync('npm install', { cwd: path.join(__dirname, '../backend'), stdio: 'inherit' });
  console.log('   ✅ Dependencias instaladas\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Setup completado!');
  console.log('');
  console.log('🚀 Para iniciar el backend:');
  console.log('   cd backend && npm start');
  console.log('');
  console.log('🌐 API disponible en:');
  console.log('   http://localhost:3001/api/users');
  console.log('   http://localhost:3001/api/sites');
  console.log('   http://localhost:3001/api/plannings');
  console.log('   http://localhost:3001/api/reports/summary');
  console.log('═══════════════════════════════════════════════════\n');
}

setup().catch(console.error);
