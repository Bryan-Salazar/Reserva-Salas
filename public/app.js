/* ===== ESTADO GLOBAL ===== */

let currentUser = null;
let listaGlobalAsignaciones = [];
let listaGlobalSalas = [];

/* ===== Modales Bootstrap ===== */
let bsModalPassword, bsModalUsuarios, bsModalSalas, bsModalEditarSala, bsModalDetalle;


/* ===== REFERENCIAS DOM ===== */

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
    salaDetallesInfo: getElement('sala-detalles-info'), // NUEVO ELEMENTO
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


/* ===== INICIALIZACIÓN ===== */

document.addEventListener('DOMContentLoaded', () => {
    bsModalPassword = new bootstrap.Modal(getElement('modal-password'));
    bsModalUsuarios = new bootstrap.Modal(getElement('modal-usuarios'));
    bsModalSalas = new bootstrap.Modal(getElement('modal-lista-salas'));
    bsModalEditarSala = new bootstrap.Modal(getElement('modal-editar-sala'));
    bsModalDetalle = new bootstrap.Modal(getElement('modal-detalle-reserva'));
    
    inicializarEventos();
    precargarDatosPublicos();
});

function inicializarEventos() {
    /* ===== Login y logout ===== */
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.btnLogout.addEventListener('click', handleLogout);
    
    /* ===== Modales ===== */
    elements.btnModalPassword.addEventListener('click', () => bsModalPassword.show());
    elements.btnModalUsuarios.addEventListener('click', () => bsModalUsuarios.show());
    elements.btnModalSalas.addEventListener('click', () => bsModalSalas.show());
    
    /* ===== Formularios ===== */
    getElement('form-password').addEventListener('submit', handleCambiarPassword);
    getElement('form-usuarios').addEventListener('submit', handleCrearUsuario);
    elements.reservaForm.addEventListener('submit', handleCrearReserva);
    elements.formEditarSala.addEventListener('submit', handleEditarSala);
    
    /* ===== Comportamientos Dinámicos ===== */
    elements.btnVista.addEventListener('click', toggleVista);
    elements.filtroDia.addEventListener('change', actualizarCalendario);
    
    // NUEVO EVENTO: Detectar cambio en el select de salas
    elements.salaSelect.addEventListener('change', actualizarInfoSala);

    /* ===== Eventos Cronograma Público ===== */
    const modalPublico = getElement('modal-cronograma-publico');
    if (modalPublico) {
        modalPublico.addEventListener('show.bs.modal', actualizarCronogramaPublico);
    }
    const filtroPublico = getElement('filtro-dia-publico');
    if (filtroPublico) {
        filtroPublico.addEventListener('change', actualizarCronogramaPublico);
    }
}


/* ===== FORMATOS DE PRESENTACIÓN AMIGABLES ===== */

function formatearHoraAMPM(horaStr) {
    if (!horaStr) return '';
    const partes = horaStr.split(':');
    let horas = parseInt(partes[0], 10);
    const minutos = partes[1];
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12;
    horas = horas ? horas : 12; 
    return `${horas}:${minutos} ${ampm}`;
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
}


/* ===== AUTENTICACIÓN ===== */

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
    
    const isAdmin = currentUser.rol === 'ADMIN';
    elements.btnModalUsuarios.classList.toggle('d-none', !isAdmin);
    elements.btnModalSalas.classList.toggle('d-none', !isAdmin);

    elements.btnVista.textContent = 'Ver Lista';
    elements.contenedorLista.classList.add('d-none');
    elements.contenedorCalendario.classList.remove('d-none');

    await cargarSalas();
    await cargarAsignaciones();
}


/* ===== CARGA DE DATOS ===== */

async function precargarDatosPublicos() {
    try {
        const [resSalas, resAsig] = await Promise.all([
            fetch('/api/salas'),
            fetch('/api/asignaciones')
        ]);
        listaGlobalSalas = await resSalas.json();
        listaGlobalAsignaciones = await resAsig.json();
    } catch (error) {
        console.error('Error al precargar datos públicos:', error);
    }
}

async function cargarSalas() {
    const response = await fetch('/api/salas');
    const salas = await response.json();
    listaGlobalSalas = salas;
    
    /* ===== Llenar select de formulario ===== */
    elements.salaSelect.innerHTML = salas.map(sala => 
        `<option value="${sala.id}">${sala.nombre}</option>`
    ).join('');

    // Disparamos la función manualmente la primera vez para mostrar info de la primera sala
    actualizarInfoSala();

    /* ===== Renderizar inventario admin ===== */
    if (currentUser?.rol === 'ADMIN' && elements.contenedorListaSalas) {
        elements.contenedorListaSalas.innerHTML = salas.map(sala => `
            <div class="p-3 bg-light border rounded d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold text-dark">${sala.nombre}</div>
                    <div class="small text-muted">Capacidad: ${sala.capacidad} | Computadores: ${sala.computadores}</div>
                    ${sala.detalles ? `<div class="small text-secondary">${sala.detalles}</div>` : ''}
                </div>
                <button onclick="abrirEditarSala(${sala.id})" class="btn btn-intep text-white fw-bold">
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


/* ===== VISTAS ===== */

// NUEVA FUNCIÓN: Muestra la info de la sala seleccionada debajo del <select>
function actualizarInfoSala() {
    const salaId = parseInt(elements.salaSelect.value);
    const sala = listaGlobalSalas.find(s => s.id === salaId);
    
    if (sala) {
        elements.salaDetallesInfo.classList.remove('d-none');
        elements.salaDetallesInfo.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span><strong class="text-dark">Capacidad:</strong> ${sala.capacidad} pers.</span>
                <span><strong class="text-dark">PCs:</strong> ${sala.computadores} unds.</span>
            </div>
            ${sala.detalles ? `<div class="border-top pt-1 mt-1"><strong class="text-dark">Detalles:</strong> ${sala.detalles}</div>` : ''}
        `;
    } else {
        elements.salaDetallesInfo.classList.add('d-none');
        elements.salaDetallesInfo.innerHTML = '';
    }
}

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
        const isOwner = currentUser && (currentUser.rol === 'ADMIN' || asig.usuario_id === currentUser.id);
        const btnDelete = isOwner ? 
            `<button onclick="eliminarAsignacion(${asig.id})" class="btn btn-danger btn-sm">Eliminar</button>` : '';

        const horarioAmPm = `${formatearHoraAMPM(asig.hora_inicio)} - ${formatearHoraAMPM(asig.hora_fin)}`;
        const periodoFormato = `${formatearFecha(asig.fecha_inicio)} al ${formatearFecha(asig.fecha_fin)}`;

        return `
            <tr>
                <td>${asig.nombre_sala}</td>
                <td>${asig.dia_semana}</td>
                <td>${horarioAmPm}</td>
                <td>${periodoFormato}</td>
                <td>${asig.docente}<br><small class="text-muted">${asig.asignatura}</small></td>
                <td>${asig.nombre_unidad}</td>
                <td>${btnDelete}</td>
            </tr>
        `;
    }).join('');
}

function actualizarCalendario() {
    const diaSeleccionado = elements.filtroDia.value;
    renderizarGrillaCore(elements.theadSalasDinamicas, elements.tbodyCalendario, diaSeleccionado, false);
}

function actualizarCronogramaPublico() {
    const diaSeleccionado = getElement('filtro-dia-publico').value;
    const theadPublico = getElement('thead-publico');
    const tbodyPublico = getElement('tbody-publico');
    renderizarGrillaCore(theadPublico, tbodyPublico, diaSeleccionado, true);
}

/* ===== HELPER TRADUCTOR DE HORAS (Soporta Formato 24h y AM/PM) ===== */
function obtenerHoraNumerica(horaStr) {
    if (!horaStr) return 0;
    const texto = horaStr.toString().toUpperCase();
    let horaNum = parseInt(texto.split(':')[0], 10);
    
    if ((texto.includes('PM') || texto.includes('P.M.')) && horaNum !== 12) {
        horaNum += 12;
    } else if ((texto.includes('AM') || texto.includes('A.M.')) && horaNum === 12) {
        horaNum = 0;
    }
    return horaNum;
}

/* ===== ÚNICO MOTOR DE RENDERIZADO PARA CRONOGRAMAS (UNIFICADO) ===== */
function renderizarGrillaCore(theadElement, tbodyElement, diaSeleccionado, esPublico = false) {
    if (!theadElement || !tbodyElement) return;

    theadElement.innerHTML = `<th style="width: 90px; min-width: 90px; vertical-align: middle;" class="bg-intep text-white text-center">Hora</th>` + 
        listaGlobalSalas.map(sala => 
            `<th style="width: 220px; min-width: 220px; vertical-align: middle;" class="bg-intep text-white text-center">${sala.nombre}</th>`
        ).join('');

    tbodyElement.innerHTML = '';
    const ocupadoHastaPorSala = {};
    listaGlobalSalas.forEach(s => ocupadoHastaPorSala[s.nombre] = 0);

    const asignacionesDelDia = listaGlobalAsignaciones.filter(a => a.dia_semana === diaSeleccionado);

    for (let hora = 6; hora <= 22; hora++) {
        const tr = document.createElement('tr');
        const ampm = hora >= 12 ? 'p.m.' : 'a.m.';
        const hora12 = hora > 12 ? hora - 12 : (hora === 0 ? 12 : hora);
        const horaStr = `${String(hora12).padStart(2, '0')}:00 ${ampm}`;
        
        tr.innerHTML = `<td class="bg-light fw-bold text-secondary align-middle text-center" style="font-size: 11px;">${horaStr}</td>`;

        listaGlobalSalas.forEach(sala => {
            if (hora < ocupadoHastaPorSala[sala.nombre]) return;

            const reservasEnEstaHora = asignacionesDelDia.filter(asig => {
                if (asig.nombre_sala !== sala.nombre) return false;
                return obtenerHoraNumerica(asig.hora_inicio) === hora;
            });

            if (reservasEnEstaHora.length > 0) {
                const maxHFin = Math.max(...reservasEnEstaHora.map(r => obtenerHoraNumerica(r.hora_fin)));
                const filasSpan = maxHFin - hora;
                ocupadoHastaPorSala[sala.nombre] = maxHFin;

                const coloresBordes = ['#0099db', '#2ec4b6', '#ff9f1c', '#e71d36'];

                tr.innerHTML += `
                    <td rowspan="${filasSpan}" class="align-middle p-2" style="background-color: #f0f7fc;">
                        <div class="d-flex flex-column gap-2">
                            ${reservasEnEstaHora.map((reserva, index) => {
                                const isOwner = !esPublico && currentUser && (currentUser.rol === 'ADMIN' || reserva.usuario_id === currentUser.id);
                                const btnDelete = isOwner ? 
                                    `<button onclick="event.stopPropagation(); eliminarAsignacion(${reserva.id})" class="btn btn-danger text-white py-0 px-1 btn-sm w-100 mt-2 fw-bold" style="font-size: 10px;">Liberar</button>` : '';
                                
                                const colorBorde = coloresBordes[index % coloresBordes.length];
                                const fechaFormat = `${formatearFecha(reserva.fecha_inicio)} al ${formatearFecha(reserva.fecha_fin)}`;

                                return `
                                    <div onclick="abrirDetalleReserva(${reserva.id}, event)" 
                                         class="card bg-white shadow-sm p-2 text-center rounded-2 card-interactiva-zoom" 
                                         style="font-size: 11px; line-height: 1.3; border-left: 4px solid ${colorBorde}; cursor: pointer;">
                                        <div class="fw-bold text-intep mb-1" style="font-size: 12px;">${reserva.asignatura}</div>
                                        <div class="text-dark fw-semibold mb-1" style="font-size: 11px;">${reserva.docente}</div>
                                        <div class="mb-2">
                                            <span class="badge bg-dark bg-opacity-75 text-white px-2 py-1" style="font-size: 9px;">
                                                ${fechaFormat}
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
            } else {
                const claseCelda = esPublico ? 'bg-white' : 'bg-white celda-reserva';
                tr.innerHTML += `<td class="${claseCelda}"></td>`;
            }
        });
        
        tbodyElement.appendChild(tr);
    }
}


/* ===== ACCIONES DE FORMULARIOS ===== */

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
            actualizarInfoSala(); // Reseteamos la vista de detalles al limpiar formulario
            cargarAsignaciones();
        } else {
            alert('⛔ ERROR: ' + data.error + (data.detalle ? '\n\n' + data.detalle : ''));
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
            
            // Volver a abrir la lista de salas automáticamente para mayor comodidad
            setTimeout(() => {
                bsModalSalas.show();
            }, 400); // Pequeña pausa de 400ms para evitar que los modales de Bootstrap se traben al cruzar animaciones

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


/* ===== FUNCIONES GLOBALES (llamadas desde HTML) ===== */

window.abrirEditarSala = function(id) {
    // Buscamos la sala directamente de la memoria para evitar errores de comillas
    const sala = listaGlobalSalas.find(s => s.id === id);
    if (!sala) return;

    getElement('edit-sala-id').value = sala.id;
    getElement('edit-sala-nombre').value = sala.nombre;
    getElement('edit-sala-capacidad').value = sala.capacidad;
    getElement('edit-sala-computadores').value = sala.computadores;
    getElement('edit-sala-detalles').value = sala.detalles || '';
    
    bsModalSalas.hide();
    bsModalEditarSala.show();
};

window.abrirDetalleReserva = function(id, event) {
    if (event) event.stopPropagation();
    
    const reserva = listaGlobalAsignaciones.find(a => a.id === id);
    if (!reserva) return;

    getElement('zoom-asignatura').textContent = reserva.asignatura;
    getElement('zoom-docente').textContent = reserva.docente;
    getElement('zoom-sala').textContent = reserva.nombre_sala;
    getElement('zoom-dia').textContent = reserva.dia_semana;
    
    const horariFormateado = `${formatearHoraAMPM(reserva.hora_inicio)} - ${formatearHoraAMPM(reserva.hora_fin)}`;
    getElement('zoom-horario').textContent = horariFormateado;
    
    const fechaFormateada = `${formatearFecha(reserva.fecha_inicio)} al ${formatearFecha(reserva.fecha_fin)}`;
    getElement('zoom-periodo').textContent = fechaFormateada;
    
    getElement('zoom-unidad').textContent = reserva.nombre_unidad;

    bsModalDetalle.show();
};

window.eliminarAsignacion = eliminarAsignacion;