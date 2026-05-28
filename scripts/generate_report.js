const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'proyectosapp_db',
  user:     process.env.DB_USER || process.env.USER || 'fernandoaldao',
  password: process.env.DB_PASSWORD || '',
});

// Helper for formatting date
function formatDate(dateVal) {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper for formatting date/time
function formatDateTime(dateVal) {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} a las ${hrs}:${mins}`;
}

// Helper to resolve nested path in object
function getValueByPath(obj, pathStr) {
  return pathStr.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}

// Helper to download image URL into buffer (handles local file path fallback and 301/302 redirects)
function downloadImage(url) {
  // Check if it's a URL referencing an upload
  if (url.includes('/uploads/')) {
    const filename = path.basename(url);
    const localPath = path.join(__dirname, '../backend/uploads', filename);
    if (fs.existsSync(localPath)) {
      console.log(`      📁 Found local photo file: ${localPath}`);
      return Promise.resolve(fs.readFileSync(localPath));
    }
  }

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        console.log(`      🔄 Following redirect to: ${redirectUrl}`);
        downloadImage(redirectUrl).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode} for ${url}`));
        return;
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

// Helper to parse cell address col/row
function cellToColRow(cellStr) {
  const match = cellStr.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  const colStr = match[1];
  const row = parseInt(match[2]);
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return { col, row };
}

// Find merged range starting at top-left address
function getMergedRange(sheet, address) {
  if (!sheet.model || !sheet.model.merges) return null;
  for (const mergeStr of sheet.model.merges) {
    const [startCell, endCell] = mergeStr.split(':');
    if (startCell === address) {
      return { startCell, endCell };
    }
  }
  return null;
}

async function run() {
  const client = await pool.connect();
  try {
    const siteId = process.argv[2] || 'AM790';
    console.log(`\n🔍 Fetching planning and technical details for site ${siteId}...`);

    // Fetch site
    const siteRes = await client.query('SELECT * FROM sites WHERE id = $1', [siteId]);
    if (!siteRes.rowCount) throw new Error(`Site ${siteId} not found in database.`);
    const site = siteRes.rows[0];

    // Fetch planning
    const planningRes = await client.query('SELECT * FROM plannings WHERE site_id = $1 ORDER BY created_at DESC LIMIT 1', [siteId]);
    if (!planningRes.rowCount) throw new Error(`No planning found for site ${siteId}.`);
    const planning = planningRes.rows[0];

    // Fetch child tables
    const [hallazgosRes, datosGenRes] = await Promise.all([
      client.query('SELECT * FROM hallazgos WHERE planning_id = $1', [planning.id]),
      client.query('SELECT * FROM datos_generales WHERE planning_id = $1', [planning.id]),
    ]);

    const hallazgos = hallazgosRes.rows[0] || null;
    const datosGen = datosGenRes.rows[0] || null;

    // Build the consolidated data object
    const data = {
      sites: site,
      plannings: {
        ...planning,
        scheduled_date: formatDate(planning.scheduled_date),
        start_time: formatDateTime(planning.start_time),
        end_time: formatDateTime(planning.end_time),
      },
      datos_generales: {
        tipo_estructura: datosGen ? datosGen.tipo_estructura : '',
        tipo_contenedor: datosGen ? datosGen.tipo_contenedor : '',
        numeroMedidor: datosGen ? datosGen.numero_medidor : '',
        lecturaConsumo: datosGen ? datosGen.lectura_consumo : '',
      },
      hallazgos: {
        observaciones: hallazgos ? hallazgos.observaciones : '',
      }
    };

    const templatePath = '/Users/fernandoaldao/Downloads/Informe_Apagado_Bafi.xlsx';
    const outputPath = `/Users/fernandoaldao/Downloads/Informe_${siteId}_Apagado_Bafi.xlsx`;

    console.log(`📂 Reading Excel Template: ${templatePath}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    console.log('🔄 Processing placeholders in worksheets...');

    for (const sheet of workbook.worksheets) {
      console.log(`   → Processing Sheet: ${sheet.name}`);
      
      // We must track cell replacements and image insertions
      const imagePromises = [];

      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.value && typeof cell.value === 'string') {
            const cellVal = cell.value.trim();

            // 1. Check if it's an IMAGE placeholder
            if (cellVal.startsWith('{{IMAGE:') && cellVal.endsWith('}}')) {
              const pathStr = cellVal.slice(8, -2).trim();
              const imageUrl = getValueByPath(data, pathStr);
              const cellAddress = cell.address;

              if (imageUrl) {
                console.log(`      📸 Found IMAGE placeholder: ${cellAddress} -> ${pathStr}`);
                
                // Clear the cell value text
                cell.value = '';

                // Schedule download and insertion
                const promise = downloadImage(imageUrl)
                  .then(buffer => {
                    const imageId = workbook.addImage({
                      buffer: buffer,
                      extension: 'jpeg',
                    });

                    const merge = getMergedRange(sheet, cellAddress);
                    if (merge) {
                      const start = cellToColRow(merge.startCell);
                      const end = cellToColRow(merge.endCell);
                      sheet.addImage(imageId, {
                        tl: { col: start.col - 1, row: start.row - 1 },
                        br: { col: end.col, row: end.row },
                        editAs: 'oneCell'
                      });
                      console.log(`      ✅ Inserted image into merged range: ${merge.startCell}:${merge.endCell}`);
                    } else {
                      sheet.addImage(imageId, {
                        tl: { col: colNumber - 1, row: rowNumber - 1 },
                        ext: { width: 300, height: 225 },
                        editAs: 'oneCell'
                      });
                      console.log(`      ✅ Inserted image at cell: ${cellAddress}`);
                    }
                  })
                  .catch(err => {
                    console.error(`      ❌ Failed to download image for ${pathStr}:`, err.message);
                    cell.value = `[Error al descargar imagen: ${err.message}]`;
                  });

                imagePromises.push(promise);
              } else {
                console.log(`      ⚠️ No image URL found for: ${pathStr}`);
                cell.value = ''; // clear placeholder if no image URL
              }
            }
            // 2. Check if it's a standard TEXT placeholder
            else if (cellVal.includes('{{') && cellVal.includes('}}')) {
              let cellStr = cell.value;
              const matches = cellStr.match(/\{\{([^}]+)\}\}/g);
              if (matches) {
                for (const match of matches) {
                  const pathStr = match.slice(2, -2).trim();
                  let val = getValueByPath(data, pathStr);
                  
                  if (val === true) val = 'SI';
                  else if (val === false) val = 'NO';
                  else if (val === undefined || val === null) val = '';
                  
                  cellStr = cellStr.replace(match, val);
                }
                cell.value = cellStr;
              }
            }
          }
        });
      });

      // Wait for all images in this sheet to be downloaded and inserted
      if (imagePromises.length > 0) {
        console.log(`      ⏳ Waiting for ${imagePromises.length} images to download...`);
        await Promise.all(imagePromises);
      }
    }

    console.log(`💾 Writing final populated Excel to: ${outputPath}`);
    await workbook.xlsx.writeFile(outputPath);
    console.log('🎉 Report generated successfully!');

  } catch (err) {
    console.error('❌ Error during report generation:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
