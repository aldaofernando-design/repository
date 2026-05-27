const url = 'http://localhost:3001/api/plannings/p1779822255040';
const data = {
  status: 'En ejecución',
  endTime: null
};

fetch(url, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
  .then(res => res.json())
  .then(json => {
    console.log('Response:', json);
  })
  .catch(err => {
    console.error('Error:', err);
  });
