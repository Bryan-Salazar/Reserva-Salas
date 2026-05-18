const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Inicializando la base de datos...");

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT NOT NULL,
        nombre_unidad TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS salas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        capacidad INTEGER NOT NULL,
        computadores INTEGER NOT NULL,
        detalles TEXT
    )`);

    // TABLA ASIGNACIONES (Ya no tiene el campo "programa")
    db.run(`CREATE TABLE IF NOT EXISTS asignaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sala_id INTEGER,
        usuario_id INTEGER,
        docente TEXT NOT NULL,
        asignatura TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL,
        dia_semana TEXT NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        FOREIGN KEY(sala_id) REFERENCES salas(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )`);

    // Insertar Usuarios Semilla Actualizados
    db.get("SELECT COUNT(*) AS count FROM usuarios", (err, row) => {
        if (row.count === 0) {
            const insertUser = db.prepare("INSERT INTO usuarios (username, password, rol, nombre_unidad) VALUES (?, ?, ?, ?)");
            insertUser.run('admin', 'admin123', 'ADMIN', 'Administrador del Sistema');
            // NUEVAS UNIDADES
            insertUser.run('adminconta', 'conta123', 'UNIDAD', 'Unidad de Administración y Contaduría');
            insertUser.run('ambiental', 'agro123', 'UNIDAD', 'Unidad de Ciencias Ambientales y Agropecuarias');
            insertUser.run('sistemas', 'sistemas123', 'UNIDAD', 'Unidad de Sistemas y Electricidad');
            insertUser.finalize();
            console.log("Usuarios iniciales creados.");
        }

        db.get("SELECT COUNT(*) AS count FROM salas", (err, row) => {
            if (row.count === 0) {
                const insertRoom = db.prepare("INSERT INTO salas (nombre, capacidad, computadores, detalles) VALUES (?, ?, ?, ?)");
                for (let i = 1; i <= 8; i++) {
                    insertRoom.run(`SALA DE SISTEMAS # ${i}`, 30, 30, 'Sala general');
                }
                insertRoom.finalize();
                console.log("8 Salas iniciales creadas.");
            }

            db.close(() => {
                console.log("Proceso de base de datos finalizado correctamente.");
            });
        });
    });
});