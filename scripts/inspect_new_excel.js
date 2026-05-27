const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('/Users/fernandoaldao/Downloads/Sitios_Apagado_Bafi.xlsx');
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  if (data.length > 0) {
    console.log('Sample row:', data[0]);
    console.log('Total rows:', data.length);
    const keys = Object.keys(data[0]);
    console.log('Columns:', keys);
    
    // Check projects
    const projects = new Set(data.map(r => r.Proyecto).filter(Boolean));
    console.log('Projects:', Array.from(projects));
  } else {
    console.log('No data found in sheet.');
  }
} catch (e) {
  console.error('Error:', e);
}
