// ==========================================
// VARIABLES GLOBALES Y REFERENCIAS DOM
// ==========================================
let currentUser = null;
let listaGlobalAsignaciones = [];
let vistaActual = 'lista';

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

// Referencias de Modales
const btnModalPassword = document.getElementById('btn-modal-password');
const btnModalUsuarios = document.getElementById('btn-modal-usuarios');
const btnModalSalas = document.getElementById('btn-modal-salas'); // NUEVO
const contenedorListaSalas = document.getElementById('contenedor-lista-salas'); // NUEVO
const formEditarSala = document.getElementById('editar-sala-form'); // NUEVO

// ==========================================
// 1. SISTEMA DE LOGIN Y LOGOUT
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
            loginError.classList.add('hidden');
            mostrarDashboard();
        } else {
            loginError.textContent = data.error;
            loginError.classList.remove('hidden');
        }
    } catch (error) { console.error("Error:", error); }
});

btnLogout.addEventListener('click', () => {
    currentUser = null;
    loginForm.reset();
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
    loginView.classList.add('flex');
});

async function mostrarDashboard() {
    loginView.classList.remove('flex');
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    userInfo.textContent = `${currentUser.nombre_unidad} (${currentUser.rol})`;
    
    // Si es ADMIN, mostramos los botones especiales
    if (currentUser.rol === 'ADMIN') {
        btnModalUsuarios.classList.remove('hidden');
        btnModalSalas.classList.remove('hidden');
    } else {
        btnModalUsuarios.classList.add('hidden');
        btnModalSalas.classList.add('hidden');
    }

    await cargarSalas();
    await cargarAsignaciones();
}

// ==========================================
// 2. MODALES (APERTURA Y CIERRE UNIVERSAL)
// ==========================================
btnModalPassword.addEventListener('click', () => document.getElementById('modal-password').classList.remove('hidden'));
btnModalUsuarios.addEventListener('click', () => document.getElementById('modal-usuarios').classList.remove('hidden'));
btnModalSalas.addEventListener('click', () => document.getElementById('modal-lista-salas').classList.remove('hidden'));

// Cierra cualquier modal que esté abierto
document.querySelectorAll('.btn-cerrar-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-bg').forEach(m => m.classList.add('hidden'));
    });
});

// ==========================================
// 3. GESTIÓN DE SALAS (NUEVO - SOLO ADMIN)
// ==========================================
window.abrirEditarSala = function(id, nombre, capacidad, computadores, detalles) {
    // Llenamos el formulario con los datos de la sala
    document.getElementById('edit-sala-id').value = id;
    document.getElementById('edit-sala-nombre').value = nombre;
    document.getElementById('edit-sala-capacidad').value = capacidad;
    document.getElementById('edit-sala-computadores').value = computadores;
    document.getElementById('edit-sala-detalles').value = detalles;
    
    // Cambiamos de modal
    document.getElementById('modal-lista-salas').classList.add('hidden');
    document.getElementById('modal-editar-sala').classList.remove('hidden');
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
            document.getElementById('modal-editar-sala').classList.add('hidden');
            await cargarSalas(); 
            await cargarAsignaciones(); 
        } else {
            alert('⛔ Error: ' + data.error);
        }
    } catch(err) { console.error(err); }
});

// ==========================================
// 4. CARGA DE DATOS Y RENDERIZADO
// ==========================================
async function cargarSalas() {
    const response = await fetch('/api/salas');
    const salas = await response.json();
    
    salaSelect.innerHTML = '';
    filtroSala.innerHTML = '<option value="TODAS">Todas las salas</option>';
    if (contenedorListaSalas) contenedorListaSalas.innerHTML = ''; // Limpiar panel admin

    salas.forEach(sala => {
        // Formulario
        const optionForm = document.createElement('option');
        optionForm.value = sala.id;
        optionForm.textContent = `${sala.nombre} (Cap: ${sala.capacidad}) (Comp: ${sala.computadores}) (${sala.detalles})`;
        salaSelect.appendChild(optionForm);

        // Filtro
        const optionFiltro = document.createElement('option');
        optionFiltro.value = sala.nombre;
        optionFiltro.textContent = sala.nombre;
        filtroSala.appendChild(optionFiltro);

        // Panel de Gestión de Admin
        if (currentUser && currentUser.rol === 'ADMIN' && contenedorListaSalas) {
            contenedorListaSalas.innerHTML += `
                <div class="p-3 bg-gray-50 border rounded-lg flex justify-between items-center hover:bg-gray-100">
                    <div>
                        <p class="font-bold text-blue-800">${sala.nombre}</p>
                        <p class="text-xs text-gray-600">👥 Capacidad: ${sala.capacidad} | 💻 Computadores: ${sala.computadores}</p>
                        <p class="text-[11px] text-gray-500 italic mt-1">${sala.detalles || 'Sin detalles configurados'}</p>
                    </div>
                    <button onclick="abrirEditarSala(${sala.id}, '${sala.nombre}', ${sala.capacidad}, ${sala.computadores}, '${sala.detalles || ''}')" 
                            class="bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
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
        contenedorLista.classList.add('hidden');
        contenedorCalendario.classList.remove('hidden');
        if(filtroSala.value === "TODAS") filtroSala.selectedIndex = 1; 
    } else {
        vistaActual = 'lista';
        btnVista.textContent = 'Ver Calendario';
        contenedorLista.classList.remove('hidden');
        contenedorCalendario.classList.add('hidden');
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
    const salaFiltro = filtroSala.value;
    const asignacionesFiltradas = listaGlobalAsignaciones.filter(asig => salaFiltro === "TODAS" || asig.nombre_sala === salaFiltro);

    asignacionesFiltradas.forEach(asig => {
        const tr = document.createElement('tr');
        const isOwner = currentUser.rol === 'ADMIN' || asig.usuario_id === currentUser.id;
        const btnDelete = isOwner ? `<button onclick="eliminarAsignacion(${asig.id})" class="mt-2 bg-red-100 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-200 font-bold w-full">Cancelar Reserva</button>` : '';

        tr.innerHTML = `
            <td class="p-2 font-bold text-blue-600">${asig.nombre_sala}</td>
            <td class="p-2 font-medium">${asig.dia_semana}</td>
            <td class="p-2">${asig.hora_inicio} a ${asig.hora_fin}<br><span class="text-xs text-gray-500">${asig.fecha_inicio} al ${asig.fecha_fin}</span></td>
            <td class="p-2 font-medium">${asig.docente}<br><span class="text-xs text-gray-600">${asig.asignatura}</span></td>
            <td class="p-2 text-xs bg-gray-50 rounded border-l"><span class="block mb-1">${asig.nombre_unidad}</span>${btnDelete}</td>
        `;
        tablaAsignaciones.appendChild(tr);
    });
}

function renderizarGrillaCalendario() {
    const salaFiltro = filtroSala.value;
    tbodyCalendario.innerHTML = '';

    if(salaFiltro === "TODAS") {
        tbodyCalendario.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-red-500 font-bold bg-red-50">⚠️ Selecciona una SALA en el filtro para ver su calendario.</td></tr>`;
        return;
    }

    const asignacionesFiltradas = listaGlobalAsignaciones.filter(asig => asig.nombre_sala === salaFiltro);
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    const horas = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

    horas.forEach(hora => {
        const tr = document.createElement('tr');
        const horaStr = `${hora.toString().padStart(2, '0')}:00 - ${(hora+1).toString().padStart(2, '0')}:00`;
        tr.innerHTML = `<td class="border p-2 text-xs font-bold bg-gray-100 text-center text-gray-600">${horaStr}</td>`;

        dias.forEach(dia => {
            const reserva = asignacionesFiltradas.find(asig => {
                if (asig.dia_semana !== dia) return false;
                const hInicio = parseInt(asig.hora_inicio.split(':')[0]);
                const hFin = parseInt(asig.hora_fin.split(':')[0]);
                return hora >= hInicio && hora < hFin; 
            });

            if (reserva) {
                const isOwner = currentUser.rol === 'ADMIN' || reserva.usuario_id === currentUser.id;
                const btnDelete = isOwner ? `<button onclick="eliminarAsignacion(${reserva.id})" class="mt-2 bg-red-500 text-white px-1 py-0.5 rounded text-[10px] hover:bg-red-600 w-full font-bold">Liberar</button>` : '';

                tr.innerHTML += `
                    <td class="border p-2 align-top bg-blue-100 border-blue-200 shadow-inner">
                        <div class="text-[11px] leading-tight flex flex-col h-full justify-between">
                            <div><span class="font-bold text-blue-900 block mb-1">${reserva.asignatura}</span><span class="text-gray-700 block">${reserva.docente}</span><span class="text-xs text-gray-500">${reserva.fecha_inicio} al ${reserva.fecha_fin}</span></div>
                            <div class="mt-2 pt-1 border-t border-blue-200"><span class="text-blue-600 block text-[9px] uppercase font-bold">${reserva.nombre_unidad}</span>${btnDelete}</div>
                        </div>
                    </td>
                `;
            } else {
                tr.innerHTML += `<td class="border p-1 bg-white hover:bg-gray-50 transition-colors"></td>`;
            }
        });
        tbodyCalendario.appendChild(tr);
    });
}

// ==========================================
// 5. OTRAS RUTAS (Usuarios y Asignaciones)
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
            document.getElementById('modal-password').classList.add('hidden');
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
            document.getElementById('modal-usuarios').classList.add('hidden');
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
