const http = require('http');

const data = JSON.stringify({
  NombreHabitacion: "Test Room",
  Descripcion: "Una habitacion de prueba",
  Costo: 150000,
  CapacidadMaximaPersonas: 2,
  Estado: 1,
  cantidad_camas: 1,
  tipo_camas: "sencilla"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/habitacion',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
