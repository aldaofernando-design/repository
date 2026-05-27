const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('/Users/fernandoaldao/Downloads/Usuarios_App.xlsx');
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  if (data.length > 0) {
    console.log('Sample row:', data[0]);
    console.log('Total rows:', data.length);
    console.log('Columns:', Object.keys(data[0]));
    console.log('All Rows:', data);
  } else {
    console.log('No data found.');
  }
} catch (e) {
  console.error('Error:', e);
}
