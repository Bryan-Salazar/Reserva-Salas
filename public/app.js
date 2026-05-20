// ==========================================
// ESTADO GLOBAL
// ==========================================
let currentUser = null;
let listaGlobalAsignaciones = [];
let listaGlobalSalas = [];

// Modales Bootstrap
let bsModalPassword, bsModalUsuarios, bsModalSalas, bsModalEditarSala;

// ==========================================
// REFERENCIAS DOM
// ==========================================
const getElement = (id) => document.getElementById(id);

const elements = {
    loginView: getElement('login-view'),
    dashboardView: getElement('dashboard-view'),
    loginForm: getElement('login-form'),
    loginError: getElement('login-error'),
    userInfo: getElement('user-info'),
    btnLogout: getElement('btn-logout'),
    reservaForm: getElement('reserva-form'),
    salaSelect: getElement('sala_id'),
    tablaAsignaciones: getElement('tabla-asignaciones'),
    filtroDia: getElement('filtro-dia'),
    btnVista: getElement('btn-vista'),
    contenedorLista: getElement('contenedor-lista'),
    contenedorCalendario: getElement('contenedor-calendario'),
    tbodyCalendario: getElement('tbody-calendario'),
    theadSalasDinamicas: getElement('thead-salas-dinamicas'),
    btnModalPassword: getElement('btn-modal-password'),
    btnModalUsuarios: getElement('btn-modal-usuarios'),
    btnModalSalas: getElement('btn-modal-salas'),
    contenedorListaSalas: getElement('contenedor-lista-salas'),
    formEditarSala: getElement('editar-sala-form')
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    bsModalPassword = new bootstrap.Modal(getElement('modal-password'));
    bsModalUsuarios = new bootstrap.Modal(getElement('modal-usuarios'));
    bsModalSalas = new bootstrap.Modal(getElement('modal-lista-salas'));
    bsModalEditarSala = new bootstrap.Modal(getElement('modal-editar-sala'));
    
    inicializarEventos();
});

function inicializarEventos() {
    // Login y logout
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.btnLogout.addEventListener('click', handleLogout);
    
    // Modales
    elements.btnModalPassword.addEventListener('click', () => bsModalPassword.show());
    elements.btnModalUsuarios.addEventListener('click', () => bsModalUsuarios.show());
    elements.btnModalSalas.addEventListener('click', () => bsModalSalas.show());
    
    // Formularios
    getElement('form-password').addEventListener('submit', handleCambiarPassword);
    getElement('form-usuarios').addEventListener('submit', handleCrearUsuario);
    elements.reservaForm.addEventListener('submit', handleCrearReserva);
    elements.formEditarSala.addEventListener('submit', handleEditarSala);
    
    // Vista calendario/lista
    elements.btnVista.addEventListener('click', toggleVista);
    elements.filtroDia.addEventListener('change', actualizarCalendario);
}

// ==========================================
// AUTENTICACIÓN
// ==========================================
async function handleLogin(e) {
    e.preventDefault();
    const username = getElement('username').value;
    const password = getElement('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            currentUser = data;
            elements.loginError.classList.add('d-none');
            mostrarDashboard();
        } else {
            elements.loginError.textContent = data.error;
            elements.loginError.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error en login:', error);
    }
}

function handleLogout() {
    currentUser = null;
    elements.loginForm.reset();
    elements.dashboardView.classList.add('d-none');
    elements.loginView.classList.remove('d-none');
}

async function mostrarDashboard() {
    elements.loginView.classList.add('d-none');
    elements.dashboardView.classList.remove('d-none');
    elements.userInfo.textContent = currentUser.nombre_unidad;
    
    // Mostrar controles admin
    const isAdmin = currentUser.rol === 'ADMIN';
    elements.btnModalUsuarios.classList.toggle('d-none', !isAdmin);
    elements.btnModalSalas.classList.toggle('d-none', !isAdmin);

    // Vista por defecto: calendario
    elements.btnVista.textContent = 'Ver Lista';
    elements.contenedorLista.classList.add('d-none');
    elements.contenedorCalendario.classList.remove('d-none');

    await cargarSalas();
    await cargarAsignaciones();
}

// ==========================================
// CARGA DE DATOS
// ==========================================
async function cargarSalas() {
    const response = await fetch('/api/salas');
    const salas = await response.json();
    listaGlobalSalas = salas;
    
    // Llenar select de formulario
    elements.salaSelect.innerHTML = salas.map(sala => 
        `<option value="${sala.id}">${sala.nombre} (Cap: ${sala.capacidad}) (Comp: ${sala.computadores}) ${sala.detalles ? `(${sala.detalles})` : ''}</option>`
    ).join('');

    // Renderizar inventario admin
    if (currentUser?.rol === 'ADMIN' && elements.contenedorListaSalas) {
        elements.contenedorListaSalas.innerHTML = salas.map(sala => `
            <div class="p-3 bg-light border rounded d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold text-dark">${sala.nombre}</div>
                    <div class="small text-muted">Capacidad: ${sala.capacidad} | Computadores: ${sala.computadores}</div>
                    ${sala.detalles ? `<div class="small text-secondary">${sala.detalles}</div>` : ''}
                </div>
                <button onclick="abrirEditarSala(${sala.id}, '${sala.nombre}', ${sala.capacidad}, ${sala.computadores}, '${sala.detalles || ''}')" 
                        class="btn btn-sm text-white fw-bold" style="background-color: #6f42c1;">
                    Editar
                </button>
            </div>
        `).join('');
    }
}

async function cargarAsignaciones() {
    const response = await fetch('/api/asignaciones');
    listaGlobalAsignaciones = await response.json();
    actualizarVista();
}

// ==========================================
// VISTAS
// ==========================================
function toggleVista() {
    const mostrarCalendario = elements.contenedorCalendario.classList.contains('d-none');
    
    elements.contenedorCalendario.classList.toggle('d-none', !mostrarCalendario);
    elements.contenedorLista.classList.toggle('d-none', mostrarCalendario);
    elements.btnVista.textContent = mostrarCalendario ? 'Ver Lista' : 'Ver Calendario';
    
    actualizarVista();
}

function actualizarVista() {
    if (!elements.contenedorCalendario.classList.contains('d-none')) {
        actualizarCalendario();
    } else {
        actualizarLista();
    }
}

function actualizarLista() {
    elements.tablaAsignaciones.innerHTML = listaGlobalAsignaciones.map(asig => {
        const isOwner = currentUser.rol === 'ADMIN' || asig.usuario_id === currentUser.id;
        const btnDelete = isOwner ? 
            `<button onclick="eliminarAsignacion(${asig.id})" class="btn btn-danger btn-sm">Eliminar</button>` : '';

        return `
            <tr>
                <td>${asig.nombre_sala}</td>
                <td>${asig.dia_semana}</td>
                <td>${asig.hora_inicio} - ${asig.hora_fin}</td>
                <td>${asig.fecha_inicio} al ${asig.fecha_fin}</td>
                <td>${asig.docente}<br><small class="text-muted">${asig.asignatura}</small></td>
                <td>${asig.nombre_unidad}</td>
                <td>${btnDelete}</td>
            </tr>
        `;
    }).join('');
}

function actualizarCalendario() {
    const diaSeleccionado = elements.filtroDia.value;
    const asignacionesDelDia = listaGlobalAsignaciones.filter(a => a.dia_semana === diaSeleccionado);

    // Encabezados dinámicos
    elements.theadSalasDinamicas.innerHTML = '<th class="bg-intep text-white">Hora</th>' + 
        listaGlobalSalas.map(sala => 
            `<th class="bg-intep text-white text-center">${sala.nombre}</th>`
        ).join('');

    // Generar filas por hora
    elements.tbodyCalendario.innerHTML = '';
    const ocupadoHastaPorSala = {};
    
    for (let hora = 7; hora <= 21; hora++) {
        const tr = document.createElement('tr');
        const ampm = hora >= 12 ? 'p.m.' : 'a.m.';
        const hora12 = hora > 12 ? hora - 12 : hora;
        const horaStr = `${String(hora12).padStart(2, '0')}:00 ${ampm}`;
        
        tr.innerHTML = `<td class="bg-light fw-bold text-secondary align-middle text-center" style="font-size: 11px;">${horaStr}</td>`;

        listaGlobalSalas.forEach(sala => {
            if (hora < (ocupadoHastaPorSala[sala.nombre] || 0)) return;

            const reservasEnEstaHora = asignacionesDelDia.filter(asig => 
                asig.nombre_sala === sala.nombre && parseInt(asig.hora_inicio.split(':')[0]) === hora
            );

            if (reservasEnEstaHora.length > 0) {
                const maxHFin = Math.max(...reservasEnEstaHora.map(r => parseInt(r.hora_fin.split(':')[0])));
                const filasSpan = maxHFin - hora;
                ocupadoHastaPorSala[sala.nombre] = maxHFin;

                const estilosCards = [
                    { bg: 'bg-white text-dark', border: 'border-start border-gray border-1' },
                    { bg: 'bg-light text-dark', border: 'border-start border-success border-1' },
                    { bg: 'bg-white text-dark', border: 'border-start border-warning border-1' }
                ];

                const contenidoCelda = `
                    <td rowspan="${filasSpan}" class="align-middle p-2" style="background-color: #f0f7fc;">
                        <div class="d-flex flex-column gap-2">
                            ${reservasEnEstaHora.map((reserva, index) => {
                                const isOwner = currentUser.rol === 'ADMIN' || reserva.usuario_id === currentUser.id;
                                const btnDelete = isOwner ? 
                                    `<button onclick="eliminarAsignacion(${reserva.id})" class="btn btn-danger text-white py-0 px-1 btn-sm w-100 mt-2 fw-bold" style="font-size: 10px;">Liberar</button>` : '';
                                const estilo = estilosCards[index % estilosCards.length];

                                return `
                                    <div class="card ${estilo.bg} ${estilo.border} shadow-sm p-2 text-center" style="font-size: 11px;">
                                        <div class="fw-bold text-intep mb-1" style="font-size: 12px;">${reserva.asignatura}</div>
                                        <div class="text-dark fw-semibold mb-1" style="font-size: 11px;">${reserva.docente}</div>
                                        <div class="mb-2">
                                            <span class="badge bg-dark bg-opacity-75 px-2 py-1" style="font-size: 9px;">
                                                ${reserva.fecha_inicio} al ${reserva.fecha_fin}
                                            </span>
                                        </div>
                                        <div class="pt-1 border-top">
                                            <span class="d-block fw-bold text-uppercase text-muted" style="font-size: 9px;">${reserva.nombre_unidad}</span>
                                            ${btnDelete}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </td>
                `;
                tr.innerHTML += contenidoCelda;
            } else {
                tr.innerHTML += '<td class="bg-white celda-reserva"></td>';
            }
        });
        
        elements.tbodyCalendario.appendChild(tr);
    }
}

// ==========================================
// ACCIONES DE FORMULARIOS
// ==========================================
async function handleCambiarPassword(e) {
    e.preventDefault();
    const currentPassword = getElement('pass-actual').value;
    const newPassword = getElement('pass-nueva').value;
    
    try {
        const response = await fetch('/api/usuarios/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: currentUser.id, currentPassword, newPassword })
        });
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ ' + data.message);
            bsModalPassword.hide();
            e.target.reset();
        } else {
            alert('⛔ Error: ' + data.error);
        }
    } catch (error) {
        console.error(error);
    }
}

async function handleCrearUsuario(e) {
    e.preventDefault();
    const newUser = {
        admin_id: currentUser.id,
        nombre_unidad: getElement('new-unidad').value,
        username: getElement('new-username').value,
        password: getElement('new-password').value,
        rol: getElement('new-rol').value
    };
    
    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ ' + data.message);
            bsModalUsuarios.hide();
            e.target.reset();
        } else {
            alert('⛔ Error: ' + data.error);
        }
    } catch (error) {
        console.error(error);
    }
}

async function handleCrearReserva(e) {
    e.preventDefault();
    const nuevaReserva = {
        sala_id: elements.salaSelect.value,
        usuario_id: currentUser.id,
        docente: getElement('docente').value,
        asignatura: getElement('asignatura').value,
        fecha_inicio: getElement('fecha_inicio').value,
        fecha_fin: getElement('fecha_fin').value,
        dia_semana: elements.filtroDia.value,
        hora_inicio: getElement('hora_inicio').value,
        hora_fin: getElement('hora_fin').value
    };
    
    try {
        const response = await fetch('/api/asignaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaReserva)
        });
        const data = await response.json();
        
        if (response.ok) {
            alert('¡Reserva guardada con éxito!');
            elements.reservaForm.reset();
            cargarAsignaciones();
        } else {
            alert('⛔ ERROR: ' + data.error + (data.detalle ? '\n' + data.detalle : ''));
        }
    } catch (error) {
        console.error('Error al guardar:', error);
    }
}

async function handleEditarSala(e) {
    e.preventDefault();
    const id = getElement('edit-sala-id').value;
    const datos = {
        nombre: getElement('edit-sala-nombre').value,
        capacidad: parseInt(getElement('edit-sala-capacidad').value),
        computadores: parseInt(getElement('edit-sala-computadores').value),
        detalles: getElement('edit-sala-detalles').value,
        rol_solicitante: currentUser.rol
    };

    try {
        const response = await fetch(`/api/salas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ ' + data.mensaje);
            bsModalEditarSala.hide();
            await cargarSalas();
            await cargarAsignaciones();
        } else {
            alert('⛔ Error: ' + data.error);
        }
    } catch (error) {
        console.error(error);
    }
}

async function eliminarAsignacion(id) {
    if (!confirm('⚠️ ¿Estás seguro de que deseas liberar esta sala?')) return;
    
    try {
        const response = await fetch(`/api/asignaciones/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: currentUser.id, rol: currentUser.rol })
        });
        
        if (response.ok) {
            cargarAsignaciones();
        } else {
            const data = await response.json();
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
}

// ==========================================
// CRONOGRAMA PÚBLICO (visible sin login)
// ==========================================
(async function iniciarCronogramaPublico() {
    // Cargamos salas y asignaciones sin necesitar usuario logueado
    const [resSalas, resAsig] = await Promise.all([
        fetch('/api/salas'),
        fetch('/api/asignaciones')
    ]);
    const salasPublicas = await resSalas.json();
    const asignacionesPublicas = await resAsig.json();

    function renderizarPublico(dia) {
        const theadPublico = document.getElementById('thead-publico');
        const tbodyPublico = document.getElementById('tbody-publico');
        if (!theadPublico || !tbodyPublico) return;

        // Cabecera con nombres de salas
        theadPublico.innerHTML = '<th class="bg-intep text-white" style="min-width:80px;">Hora</th>';
        salasPublicas.forEach(sala => {
            theadPublico.innerHTML += `<th class="bg-intep text-white" style="min-width:160px;">${sala.nombre}</th>`;
        });

        // Filtrar asignaciones del día seleccionado
        const asigDelDia = asignacionesPublicas.filter(a => a.dia_semana === dia);

        // Mismo rango de horas que el calendario del dashboard
        const horaInicio = 6;
        const horaFin = 22;
        tbodyPublico.innerHTML = '';

        const ocupadoHasta = {};
        salasPublicas.forEach(s => ocupadoHasta[s.nombre] = 0);

        for (let hora = horaInicio; hora < horaFin; hora++) {
            const tr = document.createElement('tr');
            const ampm = hora >= 12 ? 'p.m.' : 'a.m.';
            const hora12 = hora > 12 ? hora - 12 : hora;
            tr.innerHTML = `<td class="bg-light fw-bold text-secondary align-middle text-center" style="font-size:11px;">${hora12.toString().padStart(2,'0')}:00 ${ampm}</td>`;

            salasPublicas.forEach(sala => {
                if (hora < ocupadoHasta[sala.nombre]) return;

                const reservasAqui = asigDelDia.filter(a => {
                    if (a.nombre_sala !== sala.nombre) return false;
                    return parseInt(a.hora_inicio.split(':')[0]) === hora;
                });

                if (reservasAqui.length > 0) {
                    const maxHFin = Math.max(...reservasAqui.map(r => parseInt(r.hora_fin.split(':')[0])));
                    const span = maxHFin - hora;
                    ocupadoHasta[sala.nombre] = maxHFin;

                    let celda = `<td rowspan="${span}" class="align-middle p-2" style="background-color:#f0f7fc;">
                        <div class="d-flex flex-column gap-2 align-items-center">`;

                    reservasAqui.forEach(reserva => {
                        celda += `
                            <div class="card bg-white shadow-sm w-100 p-2 text-center rounded-2" style="font-size:11px; line-height:1.3; border-left: 3px solid #0099db;">
                                <span class="fw-bold text-intep d-block mb-1" style="font-size:12px;">${reserva.asignatura}</span>
                                <span class="text-dark d-block fw-semibold mb-1">${reserva.docente}</span>
                                <span class="badge bg-dark bg-opacity-75 text-white px-2 py-1" style="font-size:9px;">
                                    ${reserva.fecha_inicio} al ${reserva.fecha_fin}
                                </span>
                            </div>`;
                    });

                    celda += `</div></td>`;
                    tr.innerHTML += celda;
                } else {
                    tr.innerHTML += `<td class="bg-white"></td>`;
                }
            });

            tbodyPublico.appendChild(tr);
        }
    }

    // Renderizar cuando se abre el modal
    const modalEl = document.getElementById('modal-cronograma-publico');
    modalEl.addEventListener('show.bs.modal', () => {
        const diaActual = document.getElementById('filtro-dia-publico').value;
        renderizarPublico(diaActual);
    });

    // Actualizar al cambiar el día
    document.getElementById('filtro-dia-publico').addEventListener('change', function () {
        renderizarPublico(this.value);
    });
})();

// ==========================================
// FUNCIONES GLOBALES (llamadas desde HTML)
// ==========================================
window.abrirEditarSala = function(id, nombre, capacidad, computadores, detalles) {
    getElement('edit-sala-id').value = id;
    getElement('edit-sala-nombre').value = nombre;
    getElement('edit-sala-capacidad').value = capacidad;
    getElement('edit-sala-computadores').value = computadores;
    getElement('edit-sala-detalles').value = detalles;
    
    bsModalSalas.hide();
    bsModalEditarSala.show();
};

window.eliminarAsignacion = eliminarAsignacion;
