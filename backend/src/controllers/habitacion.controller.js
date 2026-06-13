const service = require("../services/habitacion.service");

// 🔹 LISTAR
exports.listar = (req, res) => {
    service.listar()
        .then(data => {
            console.log("📦 Habitacion:", data); // 🔥 DEBUG
            res.json(data);
        })
        .catch(error => {
            console.error("❌ ERROR LISTAR HABITACION:", error); // 🔥 CLAVE
            res.status(500).json({
                error: "Error al listar habitacion",
                detalle: error.message
            });
        });
};

// 🔹 CREAR
exports.crear = (req, res) => {
    console.log("📥 Crear Habitación - Body:", req.body);
    if (req.file) {
        console.log("🖼️ Crear Habitación - File:", req.file);
        const host = req.get("host") || "localhost:3000";
        req.body.ImagenUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;
    }

    if (req.body.cantidad_camas && Number(req.body.cantidad_camas) < 1) {
        return res.status(400).json({ error: "La cantidad de camas debe ser mayor o igual a 1" });
    }

    service.crear(req.body)
        .then(() => res.json({ mensaje: "Creado correctamente" }))
        .catch(error => {
            console.error("❌ ERROR CREAR:", error);
            res.status(400).json(error);
        });
};

// 🔹 ACTUALIZAR
exports.actualizar = (req, res) => {
    console.log("📥 Actualizar Habitación - Body:", req.body);
    if (req.file) {
        console.log("🖼️ Actualizar Habitación - File:", req.file);
        const host = req.get("host") || "localhost:3000";
        req.body.ImagenUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;
    }

    if (req.body.cantidad_camas && Number(req.body.cantidad_camas) < 1) {
        return res.status(400).json({ error: "La cantidad de camas debe ser mayor o igual a 1" });
    }

    service.actualizar(req.params.id, req.body)
        .then(() => res.json({ mensaje: "Actualizado correctamente" }))
        .catch(error => {
            console.error("❌ ERROR ACTUALIZAR:", error);
            res.status(400).json(error);
        });
};

// 🔹 OBTENER POR ID
exports.obtener = (req, res) => {
    service.listar()
        .then(data => {
            const item = data.find(x => x.IDHabitacion == req.params.id);
            res.json(item);
        })
        .catch(error => {
            console.error("❌ ERROR OBTENER:", error);
            res.status(500).json(error);
        });
};

// 🔹 ELIMINAR (mejorado)
const db = require('../config/db');

exports.eliminar = async (req, res) => {
    const id = req.params.id;
    try {
        // 1) Verificar si existen reservas activas que referencien la habitación
        const [resCountRows] = await db.query('SELECT COUNT(*) AS cnt FROM reservas WHERE id_habitacion = ?', [id]);
        const reservasCount = resCountRows && resCountRows[0] ? Number(resCountRows[0].cnt || 0) : 0;
        if (reservasCount > 0) {
            return res.status(400).json({ error: `No se puede eliminar: existen ${reservasCount} reserva(s) que referencian esta habitación. Elimina o reasigna esas reservas primero.` });
        }

        // 2) Eliminar paquetes relacionados con esta habitación (si los hay)
        await db.query('DELETE FROM paquetes WHERE IDHabitacion = ?', [id]);

        // 3) Eliminar la habitación (imagenes_habitacion tiene FK ON DELETE CASCADE)
        await service.eliminar(id);

        return res.json({ mensaje: 'Eliminado correctamente' });
    } catch (error) {
        console.error('❌ ERROR ELIMINAR (mejorado):', error);
        return res.status(500).json({ error: 'Error al intentar eliminar la habitación', detalle: error.message });
    }
};