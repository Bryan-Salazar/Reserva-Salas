// ==========================================
// VARIABLES GLOBALES Y REFERENCIAS DOM
// ==========================================
let currentUser = null;
let listaGlobalAsignaciones = [];
let listaGlobalSalas = []; 
let vistaActual = 'calendario';

// Instancias de Modales de Bootstrap 5
let bsModalPassword, bsModalUsuarios, bsModalSalas, bsModalEditarSala;

document.addEventListener('DOMContentLoaded', () => {
    bsModalPassword = new bootstrap.Modal(document.getElementById('modal-password'));
    bsModalUsuarios = new bootstrap.Modal(document.getElementById('modal-usuarios'));
    bsModalSalas = new bootstrap.Modal(document.getElementById('modal-lista-salas'));
    bsModalEditarSala = new bootstrap.Modal(document.getElementById('modal-editar-sala'));
});

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userInfo = document.getElementById('user-info');
const btnLogout = document.getElementById('btn-logout');
const reservaForm = document.getElementById('reserva-form');
const salaSelect = document.getElementById('sala_id');
const tablaAsignaciones = document.getElementById('tabla-asignaciones');
const filtroSala = document.getElementById('filtro-sala'); 

const btnVista = document.getElementById('btn-vista');
const contenedorLista = document.getElementById('contenedor-lista');
const contenedorCalendario = document.getElementById('contenedor-calendario');
const tbodyCalendario = document.getElementById('tbody-calendario');
const theadSalasDinamicas = document.getElementById('thead-salas-dinamicas');

// Botones de Modales
const btnModalPassword = document.getElementById('btn-modal-password');
const btnModalUsuarios = document.getElementById('btn-modal-usuarios');
const btnModalSalas = document.getElementById('btn-modal-salas'); 
const contenedorListaSalas = document.getElementById('contenedor-lista-salas'); 
const formEditarSala = document.getElementById('editar-sala-form'); 

// ==========================================
// 1. CONTROL DE ACCESO (LOGIN & LOGOUT)
// ==========================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            currentUser = data;
            loginError.classList.add('d-none');
            mostrarDashboard();
        } else {
            loginError.textContent = data.error;
            loginError.classList.remove('d-none');
        }
    } catch (error) { console.error("Error en login:", error); }
});

btnLogout.addEventListener('click', () => {
    currentUser = null;
    loginForm.reset();
    dashboardView.classList.add('d-none');
    loginView.classList.remove('d-none');
});

async function mostrarDashboard() {
    loginView.classList.add('d-none');
    dashboardView.classList.remove('d-none');
    userInfo.textContent = `${currentUser.nombre_unidad} [${currentUser.rol}]`;
    
    // Visibilidad de herramientas administrativas
    if (currentUser.rol === 'ADMIN') {
        btnModalUsuarios.classList.remove('d-none');
        btnModalSalas.classList.remove('d-none');
    } else {
        btnModalUsuarios.classList.add('d-none');
        btnModalSalas.classList.add('d-none');
    }

    btnVista.textContent = 'Ver Lista';            // El botón ofrecerá pasar a la lista
    contenedorLista.classList.add('d-none');         // Ocultamos la lista por defecto
    contenedorCalendario.classList.remove('d-none'); // Mostramos el contenedor del calendario

    await cargarSalas();
    await cargarAsignaciones();
}

// ==========================================
// 2. DISPARADORES DE MODALES BOOTSTRAP
// ==========================================
btnModalPassword.addEventListener('click', () => bsModalPassword.show());
btnModalUsuarios.addEventListener('click', () => bsModalUsuarios.show());
btnModalSalas.addEventListener('click', () => bsModalSalas.show());

// ==========================================
// 3. CONTROL DE INFRAESTRUCTURA (ADMIN)
// ==========================================
window.abrirEditarSala = function(id, nombre, capacidad, computadores, detalles) {
    document.getElementById('edit-sala-id').value = id;
    document.getElementById('edit-sala-nombre').value = nombre;
    document.getElementById('edit-sala-capacidad').value = capacidad;
    document.getElementById('edit-sala-computadores').value = computadores;
    document.getElementById('edit-sala-detalles').value = detalles;
    
    bsModalSalas.hide(); 
    bsModalEditarSala.show(); 
};

formEditarSala.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-sala-id').value;
    const datos = {
        nombre: document.getElementById('edit-sala-nombre').value,
        capacidad: parseInt(document.getElementById('edit-sala-capacidad').value),
        computadores: parseInt(document.getElementById('edit-sala-computadores').value),
        detalles: document.getElementById('edit-sala-detalles').value,
        rol_solicitante: currentUser.rol
    };

    try {
        const res = await fetch(`/api/salas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const data = await res.json();
        if(res.ok) {
            alert('✅ ' + data.mensaje);
            bsModalEditarSala.hide();
            await cargarSalas(); 
            await cargarAsignaciones(); 
        } else {
            alert('⛔ Error: ' + data.error);
        }
    } catch(err) { console.error(err); }
});

// ==========================================
// 4. PROCESAMIENTO Y RENDERIZADO VISUAL
// ==========================================
async function cargarSalas() {
    const response = await fetch('/api/salas');
    const salas = await response.json();
    listaGlobalSalas = salas; 
    
    salaSelect.innerHTML = '';
    if (contenedorListaSalas) contenedorListaSalas.innerHTML = ''; 

    salas.forEach(sala => {
        const optionForm = document.createElement('option');
        optionForm.value = sala.id;
        optionForm.textContent = `${sala.nombre} (Capacidad: ${sala.capacidad} estudiantes)`;
        salaSelect.appendChild(optionForm);

        // Renderizado del Inventario del Administrador
        if (currentUser && currentUser.rol === 'ADMIN' && contenedorListaSalas) {
            contenedorListaSalas.innerHTML += `
                <div class="p-3 bg-light border rounded d-flex justify-content-between align-items-center">
                    <div>
                        <p class="mb-1 fw-bold text-primary">${sala.nombre}</p>
                        <p class="mb-1 text-muted small">👥 Capacidad: ${sala.capacidad} | 💻 Computadores: ${sala.computadores}</p>
                        <p class="mb-0 text-secondary small" style="font-style: italic;">${sala.detalles || 'Sin especificaciones añadidas'}</p>
                    </div>
                    <button onclick="abrirEditarSala(${sala.id}, '${sala.nombre}', ${sala.capacidad}, ${sala.computadores}, '${sala.detalles || ''}')" 
                            class="btn btn-sm btn-outline-secondary fw-bold">
                        ✏️ Editar
                    </button>
                </div>
            `;
        }
    });
}

async function cargarAsignaciones() {
    const response = await fetch('/api/asignaciones');
    listaGlobalAsignaciones = await response.json();
    renderizarVista();
}

btnVista.addEventListener('click', () => {
    if(vistaActual === 'lista') {
        vistaActual = 'calendario';
        btnVista.textContent = 'Ver Lista';
        contenedorLista.classList.add('d-none');
        contenedorCalendario.classList.remove('d-none');
    } else {
        vistaActual = 'lista';
        btnVista.textContent = 'Ver Calendario';
        contenedorLista.classList.remove('d-none');
        contenedorCalendario.classList.add('d-none');
    }
    renderizarVista();
});

filtroSala.addEventListener('change', renderizarVista);

function renderizarVista() {
    if(vistaActual === 'lista') renderizarTabla();
    else renderizarGrillaCalendario();
}

function renderizarTabla() {
    tablaAsignaciones.innerHTML = '';
    const diaFiltro = filtroSala.value; 
    
    const asignacionesFiltradas = listaGlobalAsignaciones.filter(asig => asig.dia_semana === diaFiltro);

    asignacionesFiltradas.forEach(asig => {
        const tr = document.createElement('tr');
        const isOwner = currentUser.rol === 'ADMIN' || asig.usuario_id === currentUser.id;
        const btnDelete = isOwner ? `<button onclick="eliminarAsignacion(${asig.id})" class="btn btn-sm btn-outline-danger py-1 px-2 w-100 mt-2 fw-bold">Cancelar Reserva</button>` : '';

        tr.innerHTML = `
            <td class="fw-bold text-primary">${asig.nombre_sala}</td>
            <td class="fw-medium">${asig.dia_semana}</td>
            <td><strong>${asig.hora_inicio} a ${asig.hora_fin}</strong><br><span class="text-muted small">${asig.fecha_inicio} al ${asig.fecha_fin}</span></td>
            <td><span class="fw-bold text-dark">${asig.docente}</span><br><span class="text-muted small">${asig.asignatura}</span></td>
            <td class="bg-light p-2 border-start">
                <span class="d-block mb-1 fw-semibold text-secondary">${asig.nombre_unidad}</span>
                ${btnDelete}
            </td>
        `;
        tablaAsignaciones.appendChild(tr);
    });
}

function renderizarGrillaCalendario() {
    const diaFiltro = filtroSala.value; 
    tbodyCalendario.innerHTML = '';
    
    // Generar dinámicamente las salas como columnas
    theadSalasDinamicas.innerHTML = `<th style="width: 110px; vertical-align: middle;">HORA</th>`;
    listaGlobalSalas.forEach(sala => {
        theadSalasDinamicas.innerHTML += `<th style="vertical-align: middle;">${sala.nombre}</th>`;
    });

    const horas = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    const asignacionesDelDia = listaGlobalAsignaciones.filter(asig => asig.dia_semana === diaFiltro);

    // CONTROLADOR: Guarda hasta qué hora está ocupada cada sala para aplicar el "salto" de celda
    const ocupadoHastaPorSala = {};
    listaGlobalSalas.forEach(sala => {
        ocupadoHastaPorSala[sala.nombre] = 0;
    });

    horas.forEach(hora => {
        const tr = document.createElement('tr');
        
        // Calcula formato 12h con a.m. y p.m.
        const ampm = hora >= 12 ? 'p.m.' : 'a.m.';
        const hora12 = hora > 12 ? hora - 12 : hora;
        const horaStr = `${hora12.toString().padStart(2, '0')}:00 ${ampm}`;
        
        tr.innerHTML = `<td class="bg-light fw-bold text-secondary align-middle text-center" style="font-size: 11px;">${horaStr}</td>`;

        listaGlobalSalas.forEach(sala => {
            
            // Si la hora actual ya está cubierta por un bloque superior, se omite esta celda
            if (hora < ocupadoHastaPorSala[sala.nombre]) {
                return; 
            }

            // CAMBIO CLAVE: Usamos .filter() para traer TODAS las reservas que inician a esta hora
            const reservasEnEstaHora = asignacionesDelDia.filter(asig => {
                if (asig.nombre_sala !== sala.nombre) return false;
                const hInicio = parseInt(asig.hora_inicio.split(':')[0]);
                return hInicio === hora; 
            });

            if (reservasEnEstaHora.length > 0) {
                // Tomamos la hora de fin mayor en caso de que una reserva dure más que la otra
                const maxHFin = Math.max(...reservasEnEstaHora.map(r => parseInt(r.hora_fin.split(':')[0])));
                const filasSpan = maxHFin - hora; 
                
                // BLOQUEAR EL ESPACIO HACIA ABAJO PARA ESTA SALA
                ocupadoHastaPorSala[sala.nombre] = maxHFin;

                // 1. Abrimos la celda principal con el rowspan (usamos un fondo neutro elegante)
                let contenidoCelda = `<td rowspan="${filasSpan}" class="align-middle p-2 border-info border-opacity-25" style="background-color: #f0f7fc; transition: background-color 0.2s;">
                    <div class="d-flex flex-column h-100 justify-content-center align-items-center w-100 gap-2">`;

                // 2. Iteramos sobre cada reserva creando tarjetas con colores de periodos diferenciados
                reservasEnEstaHora.forEach((reserva, index) => {
                    const isOwner = currentUser.rol === 'ADMIN' || reserva.usuario_id === currentUser.id;
                    const btnDelete = isOwner ? `<button onclick="eliminarAsignacion(${reserva.id})" class="btn btn-danger text-white py-0 px-1 btn-sm w-100 mt-2 fw-bold" style="font-size: 10px;">Liberar</button>` : '';
                    
                    // CONFIGURACIÓN DE COLORES EXCLUSIVOS POR PERIODO
                    // Primera reserva: Tarjeta blanca con borde azul izquierdo
                    // Segunda reserva: Tarjeta gris claro con borde verde izquierdo (puedes añadir más si es necesario)
                    const estilosCards = [
                        { bg: 'bg-white text-dark', border: 'border-start border-1' },
                        { bg: 'bg-light text-dark border', border: 'border-start border-1' },
                        { bg: 'bg-white text-dark', border: 'border-start border-1 border-warning' }
                    ];
                    
                    // Elegimos el estilo según el orden de la reserva
                    const estiloActual = estilosCards[index % estilosCards.length];

                    contenidoCelda += `
                        <div class="card ${estiloActual.bg} ${estiloActual.border} shadow-sm w-100 p-2 text-center rounded-2" style="font-size: 11px; line-height: 1.3;">
                            
                            <div>
                                <span class="fw-bold text-intep d-block mb-1" style="font-size: 12px;">${reserva.asignatura}</span>
                                <span class="text-dark d-block fw-semibold mb-1" style="font-size: 11px;">${reserva.docente}</span>
                            </div>

                            <div class="mb-2">
                                <span class="badge bg-dark bg-opacity-75 text-white px-2 py-1" style="font-size: 9px; font-weight: 600; letter-spacing: 0.3px;">
                                    ${reserva.fecha_inicio} al ${reserva.fecha_fin}
                                </span>
                            </div>
                            
                            <div class="mt-2 pt-1 border-top border-light w-100">
                                <span class="d-block fw-bold text-uppercase text-muted" style="font-size: 9px; letter-spacing: 0.2px;">${reserva.nombre_unidad}</span>
                                ${btnDelete}
                            </div>
                        </div>
                    `;
                });

                // 3. Cerramos el contenedor y la celda
                contenidoCelda += `</div></td>`;
                tr.innerHTML += contenidoCelda;

            } else {
                tr.innerHTML += `<td class="bg-white celda-reserva"></td>`;
            }
        });
        tbodyCalendario.appendChild(tr);
    });
}

// ==========================================
// 5. ACCIONES ADICIONALES (POST / PUT / DELETE)
// ==========================================
document.getElementById('form-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('pass-actual').value;
    const newPassword = document.getElementById('pass-nueva').value;
    try {
        const response = await fetch('/api/usuarios/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: currentUser.id, currentPassword, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            alert("✅ " + data.message);
            bsModalPassword.hide();
            e.target.reset();
        } else alert("⛔ Error: " + data.error);
    } catch (error) { console.error(error); }
});

document.getElementById('form-usuarios').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUser = {
        admin_id: currentUser.id,
        nombre_unidad: document.getElementById('new-unidad').value,
        username: document.getElementById('new-username').value,
        password: document.getElementById('new-password').value,
        rol: document.getElementById('new-rol').value
    };
    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        const data = await response.json();
        if (response.ok) {
            alert("✅ " + data.message);
            bsModalUsuarios.hide();
            e.target.reset();
        } else alert("⛔ Error: " + data.error);
    } catch (error) { console.error(error); }
});

reservaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevaReserva = {
        sala_id: document.getElementById('sala_id').value,
        usuario_id: currentUser.id,
        docente: document.getElementById('docente').value,
        asignatura: document.getElementById('asignatura').value,
        fecha_inicio: document.getElementById('fecha_inicio').value,
        fecha_fin: document.getElementById('fecha_fin').value,
        dia_semana: document.getElementById('dia_semana').value,
        hora_inicio: document.getElementById('hora_inicio').value,
        hora_fin: document.getElementById('hora_fin').value,
    };
    try {
        const response = await fetch('/api/asignaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaReserva)
        });
        const data = await response.json();
        if (response.ok) {
            alert("¡Reserva guardada con éxito!");
            reservaForm.reset();
            cargarAsignaciones();
        } else alert("⛔ ERROR: " + data.error);
    } catch (error) { console.error("Error al guardar:", error); }
});

async function eliminarAsignacion(id) {
    if(!confirm('⚠️ ¿Estás seguro de que deseas liberar esta sala?')) return;
    try {
        const response = await fetch(`/api/asignaciones/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: currentUser.id, rol: currentUser.rol })
        });
        if (response.ok) cargarAsignaciones();
        else alert("Error: " + (await response.json()).error);
    } catch (error) { console.error("Error al eliminar:", error); }
}