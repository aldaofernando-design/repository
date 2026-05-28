const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/fernandoaldao/Downloads/Informe_Apagado_Bafi.xlsx';
console.log('Reading Excel file from:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:J20');
    
    // Print non-empty cells
    for (let r = range.s.r; r <= Math.min(range.e.r, 100); r++) {
      let rowContent = [];
      for (let c = range.s.c; c <= Math.min(range.e.c, 20); c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellAddress];
        if (cell && cell.v !== undefined) {
          rowContent.push(`${cellAddress}: "${cell.v}"`);
        }
      }
      if (rowContent.length > 0) {
        console.log(`Row ${r + 1}:`, rowContent.join(' | '));
      }
    }
  });
} catch (err) {
  console.error('Error reading Excel:', err.message);
}
