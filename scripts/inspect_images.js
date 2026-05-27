const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('/Users/fernandoaldao/Downloads/Usuarios_App.xlsx');
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const users = XLSX.utils.sheet_to_json(worksheet);

  const files = fs.readdirSync('/Users/fernandoaldao/Downloads');
  const images = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f));

  console.log('--- Matching Users with Files in Downloads ---');
  users.forEach(u => {
    const name = u.Nombre;
    const matches = images.filter(img => {
      const normalizedImg = img.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      // Try exact name match
      if (normalizedImg.includes(normalizedName)) return true;
      
      // Try matching individual parts of the name
      const parts = normalizedName.split(/\s+/);
      return parts.every(part => normalizedImg.includes(part));
    });
    console.log(`${name}:`, matches);
  });
} catch (e) {
  console.error(e);
}
