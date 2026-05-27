#!/usr/bin/env node
/**
 * reseed_users.js
 * Vacia la tabla 'users' de PostgreSQL y carga los nuevos usuarios desde
 * /Users/fernandoaldao/Downloads/Usuarios_App.xlsx, copiando y renombrando sus fotos de perfil.
 */

const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'proyectosapp_db',
  user:     process.env.DB_USER || process.env.USER || 'fernandoaldao',
  password: process.env.DB_PASSWORD || '',
});

const downloadsDir = '/Users/fernandoaldao/Downloads';
const uploadsDir = path.join(__dirname, '../backend/uploads');

// Asegurar que existe la carpeta de subidas del backend
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔄 Iniciando reseeding de usuarios...');
    await client.query('BEGIN');

    // 1. Limpiar tabla de usuarios
    console.log('🧹 Vaciando tabla users en PostgreSQL...');
    await client.query('TRUNCATE TABLE users CASCADE;');
    console.log('✅ Tabla users vaciada.');

    // 2. Leer Excel
    const excelPath = path.join(downloadsDir, 'Usuarios_App.xlsx');
    console.log(`📍 Leyendo Excel desde: ${excelPath}`);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`No se encontró el archivo: ${excelPath}`);
    }

    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawUsers = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ Excel leído con éxito. Total filas: ${rawUsers.length}`);

    // Leer archivos de Descargas para emparejar fotos
    const downloadFiles = fs.readdirSync(downloadsDir);
    const imageFiles = downloadFiles.filter(f => /\.(png|jpg|jpeg)$/i.test(f));

    const mappedUsers = [];

    // 3. Procesar y copiar fotos
    console.log('\n📸 Procesando fotos de perfil y copiando a backend/uploads...');
    for (let i = 0; i < rawUsers.length; i++) {
      const row = rawUsers[i];
      const id = `u${i + 1}`;
      const name = row.Nombre;
      const email = row.Mail;
      const phone = row.Telefono || '';
      const company = row.Empresa || 'F1+';
      const role = row.Rol;
      const status = row.Estado || 'Activo';

      // Encontrar la foto
      const normName = normalizeStr(name);
      const nameParts = normName.split(/\s+/);

      const matchedPhoto = imageFiles.find(img => {
        const normImg = normalizeStr(img);
        // Coincidencia exacta de nombre
        if (normImg.includes(normName)) return true;
        // Coincidencia de partes del nombre
        return nameParts.every(part => normImg.includes(part));
      });

      let finalPhotoUrl = `https://i.pravatar.cc/150?u=${id}`;

      if (matchedPhoto) {
        const ext = path.extname(matchedPhoto);
        const newFileName = `profile-${id}${ext}`;
        const sourcePath = path.join(downloadsDir, matchedPhoto);
        const destPath = path.join(uploadsDir, newFileName);

        fs.copyFileSync(sourcePath, destPath);
        console.log(`   [Copiar] ${name} -> ${newFileName}`);
        // Servidor del backend usa el puerto 3001
        finalPhotoUrl = `http://192.168.1.84:3001/uploads/${newFileName}`;
      } else {
        console.log(`   [Aviso] No se encontró foto para ${name}, usando avatar por defecto.`);
      }

      const userObj = {
        id,
        name,
        email,
        phone,
        company,
        role,
        photo: finalPhotoUrl,
        status,
      };

      mappedUsers.push(userObj);

      // 4. Insertar en base de datos
      await client.query(
        `INSERT INTO users (id, name, email, phone, company, role, photo_url, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, name, email, phone, company, role, finalPhotoUrl, status]
      );
    }

    console.log(`\n✅ ${mappedUsers.length} usuarios cargados en PostgreSQL.`);

    // 5. Regenerar mockData.ts
    console.log('\n💾 Regenerando src/data/mockData.ts...');
    const mockDataPath = path.join(__dirname, '../src/data/mockData.ts');

    const mockDataContent = `import { Image } from 'react-native';
import { sitesData } from './sitesData';

export const users = ${JSON.stringify(mappedUsers, null, 2)};

export const sites = sitesData;

export const plannings = [];

export const chartData = {
  labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  planned: [0, 0, 0, 0, 0, 0, 0],
  executed: [0, 0, 0, 0, 0, 0, 0]
};
`;

    fs.writeFileSync(mockDataPath, mockDataContent, 'utf-8');
    console.log(`✅ Archivo mockData.ts regenerado en: ${mockDataPath}`);

    await client.query('COMMIT');
    console.log('\n🎉 ¡Proceso de reseeding de usuarios finalizado con éxito!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error en reseeding de usuarios:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
