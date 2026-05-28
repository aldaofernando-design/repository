const XLSX = require('xlsx');

const filePath = '/Users/fernandoaldao/Downloads/Informe_Apagado_Bafi.xlsx';
console.log('Finding all placeholders in Excel file:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\nSheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    
    let count = 0;
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellAddress];
        if (cell && cell.v !== undefined && typeof cell.v === 'string') {
          const val = cell.v.trim();
          if (val.includes('{{') && val.includes('}}')) {
            console.log(`  Cell ${cellAddress}: "${val}"`);
            count++;
          }
        }
      }
    }
    console.log(`  Total placeholders in sheet: ${count}`);
  });
} catch (err) {
  console.error('Error:', err.message);
}
