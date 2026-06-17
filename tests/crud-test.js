const base = 'http://localhost:3000/api';

function log(title, obj) {
  console.log('\n==== ' + title + ' ====');
  if (obj !== undefined) console.log(JSON.stringify(obj, null, 2));
}

async function req(path, options = {}) {
  const res = await fetch(base + path, options);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

async function main() {
  try {
    const uniq = Date.now();
    const doc = 'TEST' + uniq;
    const email = `test+${uniq}@example.com`;

    log('Registering user');
    let r = await req('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ NroDocumento: doc, Nombre: 'Prueba', Apellido: 'Tester', Direccion: 'Calle', Email: email, Telefono: '555000', Contrasena: 'password123' })
    });
    log('register', r);

    let token = r.body && (r.body.token || r.body.token);
    if (!token) {
      // Try login
      log('Logging in');
      r = await req('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: 'password123' })
      });
      log('login', r);
      token = r.body && r.body.token;
    }

    if (!token) throw new Error('No token obtained from register/login');
    log('Token acquired', { length: token.length });

    const authHeaders = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

    // HABITACION
    log('Creating habitacion');
    r = await req('/habitacion', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ NombreHabitacion: 'Habitacion Test', Descripcion: 'Desc', Costo: 123, CapacidadMaximaPersonas: 2, cantidad_camas: 1, tipo_camas: 'sencilla' })
    });
    log('create habitacion', r);
    const habitacionId = r.body && (r.body.insertId || r.body.IDHabitacion || (r.body && r.body.insertId));

    // Get list
    r = await req('/habitacion');
    log('habitacion list', r);

    // If creation returned insertId but not resource, try to read last
    let createdHabId = habitacionId;
    if (!createdHabId && Array.isArray(r.body) && r.body.length) {
      createdHabId = r.body.find(h=>h.NombreHabitacion==='Habitacion Test')?.IDHabitacion || r.body[0].IDHabitacion;
    }

    if (!createdHabId) throw new Error('No habitacion id found');

    r = await req(`/habitacion/${createdHabId}`);
    log('habitacion by id', r);

    // Update
    r = await req(`/habitacion/${createdHabId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ NombreHabitacion: 'Habitacion Test Mod', Descripcion: 'Desc mod', Costo: 200, CapacidadMaximaPersonas: 3, cantidad_camas: 2, tipo_camas: 'doble' })
    });
    log('update habitacion', r);

    r = await req(`/habitacion/${createdHabId}`);
    log('habitacion after update', r);

    // PAQUETES
    log('Creating paquete');
    r = await req('/paquetes', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ NombrePaquete: 'Paquete Test', Descripcion: 'Paquete desc', IDHabitacion: createdHabId, Precio: 50, Estado: 1 })
    });
    log('create paquete', r);
    const paqueteId = r.body && (r.body.insertId || r.body.IDPaquete);

    r = await req('/paquetes');
    log('paquetes list', r);

    let createdPaqueteId = paqueteId;
    if (!createdPaqueteId && Array.isArray(r.body) && r.body.length) {
      createdPaqueteId = r.body.find(p=>p.NombrePaquete==='Paquete Test')?.IDPaquete || r.body[0].IDPaquete;
    }

    if (!createdPaqueteId) throw new Error('No paquete id found');

    r = await req(`/paquetes/${createdPaqueteId}`);
    log('paquete by id', r);

    r = await req(`/paquetes/${createdPaqueteId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ NombrePaquete: 'Paquete Test Mod', Descripcion: 'Desc mod', IDHabitacion: createdHabId, IDServicio: null, Precio: 60, Estado: 1 })
    });
    log('update paquete', r);

    r = await req(`/paquetes/${createdPaqueteId}`);
    log('paquete after update', r);

    // SERVICIOS
    log('Creating servicio');
    r = await req('/servicios', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ NombreServicio: 'Servicio Test', Descripcion: 'Serv desc', Duracion: 60, CantidadMaximaPersonas: 5, Costo: 30, Estado: 1 })
    });
    log('create servicio', r);
    const servicioId = r.body && (r.body.insertId || r.body.IDServicio);

    r = await req('/servicios');
    log('servicios list', r);

    let createdServicioId = servicioId;
    if (!createdServicioId && Array.isArray(r.body) && r.body.length) {
      createdServicioId = r.body.find(s=>s.NombreServicio==='Servicio Test')?.IDServicio || r.body[0].IDServicio;
    }

    if (!createdServicioId) throw new Error('No servicio id found');

    r = await req(`/servicios/${createdServicioId}`);
    log('servicio by id', r);

    r = await req(`/servicios/${createdServicioId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ NombreServicio: 'Servicio Test Mod', Descripcion: 'Desc mod', Duracion: 45, CantidadMaximaPersonas: 3, Costo: 40, Estado: 1 })
    });
    log('update servicio', r);

    r = await req(`/servicios/${createdServicioId}`);
    log('servicio after update', r);

    // DELETE: paquete, servicio, habitacion
    log('Deleting paquete');
    r = await req(`/paquetes/${createdPaqueteId}`, { method: 'DELETE', headers: authHeaders });
    log('delete paquete', r);

    log('Deleting servicio');
    r = await req(`/servicios/${createdServicioId}`, { method: 'DELETE', headers: authHeaders });
    log('delete servicio', r);

    log('Deleting habitacion');
    r = await req(`/habitacion/${createdHabId}`, { method: 'DELETE', headers: authHeaders });
    log('delete habitacion', r);

    console.log('\nALL TESTS COMPLETED');
  } catch (err) {
    console.error('Test script error', err);
  }
}

main();
