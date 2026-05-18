const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // ✅ CAMBIO CRÍTICO: Puerto dinámico

// Middlewares: Para poder recibir JSON y conectar con el frontend
app.use(cors());
app.use(express.json());
// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a la base de datos
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err.message);
    } else {
        console.log('✅ Base de datos conectada correctamente');
    }
});

// ==========================================
// RUTAS DE LA API (ENDPOINTS)
// ==========================================

// 1. Login simple
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT id, username, rol, nombre_unidad FROM usuarios WHERE username = ? AND password = ?`, 
    [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });
        res.json(row); // Retornamos los datos del usuario logueado
    });
});

// 2. Obtener todas las salas
app.get('/api/salas', (req, res) => {
    db.all(`SELECT * FROM salas`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. Obtener asignaciones (con opción de filtrar por sala)
app.get('/api/asignaciones', (req, res) => {
    let query = `
        SELECT a.*, s.nombre as nombre_sala, u.nombre_unidad 
        FROM asignaciones a
        JOIN salas s ON a.sala_id = s.id
        JOIN usuarios u ON a.usuario_id = u.id
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. CREAR UNA ASIGNACIÓN (Sin campo programa)
app.post('/api/asignaciones', (req, res) => {
    const { 
        sala_id, usuario_id, docente, asignatura, 
        fecha_inicio, fecha_fin, dia_semana, hora_inicio, hora_fin 
    } = req.body;

    const queryVerificacion = `
        SELECT * FROM asignaciones 
        WHERE sala_id = ? 
        AND dia_semana = ?
        AND (fecha_inicio <= ? AND fecha_fin >= ?) 
        AND (hora_inicio < ? AND hora_fin > ?)
    `;

    db.all(queryVerificacion, [sala_id, dia_semana, fecha_fin, fecha_inicio, hora_fin, hora_inicio], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error comprobando disponibilidad' });

        if (rows.length > 0) {
            return res.status(400).json({ 
                error: '¡Cruce de horario detectado!', 
                detalle: `La sala ya está reservada por ${rows[0].docente} para la asignatura ${rows[0].asignatura} en este horario.`
            });
        }

        const queryInsert = `
            INSERT INTO asignaciones 
            (sala_id, usuario_id, docente, asignatura, fecha_inicio, fecha_fin, dia_semana, hora_inicio, hora_fin) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(queryInsert, [sala_id, usuario_id, docente, asignatura, fecha_inicio, fecha_fin, dia_semana, hora_inicio, hora_fin], function(err) {
            if (err) return res.status(500).json({ error: 'Error al guardar la asignación' });
            res.json({ mensaje: 'Asignación creada exitosamente', id: this.lastID });
        });
    });
});

// 5. ELIMINAR UNA ASIGNACIÓN (Con validación de permisos)
app.delete('/api/asignaciones/:id', (req, res) => {
    const asignacionId = req.params.id;
    const { usuario_id, rol } = req.body;

    // Primero buscamos la asignación para ver a quién le pertenece
    db.get(`SELECT usuario_id FROM asignaciones WHERE id = ?`, [asignacionId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error en la base de datos' });
        if (!row) return res.status(404).json({ error: 'Asignación no encontrada' });

        // Validar permisos: Solo el dueño o el ADMIN pueden borrar
        if (rol !== 'ADMIN' && row.usuario_id !== usuario_id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar la reserva de otra unidad.' });
        }

        // Si pasa la validación, procedemos a borrar
        db.run(`DELETE FROM asignaciones WHERE id = ?`, [asignacionId], function(err) {
            if (err) return res.status(500).json({ error: 'Error al eliminar la asignación' });
            res.json({ mensaje: 'Asignación eliminada correctamente' });
        });
    });
});

// ==========================================
// NUEVAS RUTAS DE USUARIOS
// ==========================================

// 1. Cambiar contraseña del usuario actual
app.put('/api/usuarios/password', (req, res) => {
    const { usuario_id, currentPassword, newPassword } = req.body;

    // Primero verificamos que la contraseña actual sea correcta
    db.get("SELECT * FROM usuarios WHERE id = ? AND password = ?", [usuario_id, currentPassword], (err, row) => {
        if (err || !row) {
            return res.status(401).json({ error: "La contraseña actual es incorrecta." });
        }

        // Si es correcta, actualizamos a la nueva
        db.run("UPDATE usuarios SET password = ? WHERE id = ?", [newPassword, usuario_id], function(err) {
            if (err) return res.status(500).json({ error: "Error al actualizar la contraseña." });
            res.json({ message: "Contraseña actualizada con éxito." });
        });
    });
});

// 2. Crear un nuevo usuario (SOLO ADMIN)
app.post('/api/usuarios', (req, res) => {
    const { admin_id, username, password, nombre_unidad, rol } = req.body;

    // Verificamos de forma segura que quien solicita esto sea realmente un ADMIN
    db.get("SELECT rol FROM usuarios WHERE id = ?", [admin_id], (err, row) => {
        if (err || !row || row.rol !== 'ADMIN') {
            return res.status(403).json({ error: "Acceso denegado: Solo los administradores pueden crear usuarios." });
        }

        const query = `INSERT INTO usuarios (username, password, nombre_unidad, rol) VALUES (?, ?, ?, ?)`;
        db.run(query, [username, password, nombre_unidad, rol], function(err) {
            if (err) return res.status(500).json({ error: "Error al crear el usuario. ¿Quizás el nombre de usuario ya existe?" });
            res.json({ message: "Usuario creado exitosamente.", id: this.lastID });
        });
    });
});

// Actualizar salas
app.put('/api/salas/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, capacidad, computadores, detalles, rol_solicitante } = req.body;

    // Validación estricta en el servidor
    if (rol_solicitante !== 'ADMIN') {
        return res.status(403).json({ error: 'Acceso denegado. Solo el administrador puede modificar las salas.' });
    }

    const queryUpdate = `
        UPDATE salas 
        SET nombre = ?, capacidad = ?, computadores = ?, detalles = ? 
        WHERE id = ?
    `;

    db.run(queryUpdate, [nombre, capacidad, computadores, detalles, id], function(err) {
        if (err) return res.status(500).json({ error: 'Error al actualizar la sala' });
        if (this.changes === 0) return res.status(404).json({ error: 'Sala no encontrada' });
        
        res.json({ mensaje: 'Sala actualizada correctamente' });
    });
});

// ✅ NUEVA RUTA: Health check para verificar que el servidor esté funcionando
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`¡El Motor Anti-Cruces está activado!`);
});
