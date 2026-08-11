let devolucionesCache = [];
let selectedDevolucionEstado = 'TODAS';

window.openDevolucionModal = function() {
  const modal = document.getElementById('devolucion-modal');
  const form = document.getElementById('devolucion-form');
  if (form) form.reset();
  if (modal) modal.classList.remove('hidden'), modal.classList.add('flex');
};

window.closeDevolucionModal = function() {
  const modal = document.getElementById('devolucion-modal');
  if (modal) modal.classList.add('hidden'), modal.classList.remove('flex');
};

document.addEventListener('DOMContentLoaded', () => {
  initDevoluciones();
});

async function initDevoluciones() {
  setupDevolucionPills();
  await cargarDevoluciones();
  setupDevolucionEvents();
  updateAlertBadge();
}

function setupDevolucionPills() {
  const container = document.getElementById('devolucion-status-pills');
  if (!container) return;

  container.querySelectorAll('.dev-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.dev-pill').forEach(b => {
        b.classList.remove('bg-cyan-600', 'text-white');
        b.classList.add('bg-slate-900', 'text-slate-300', 'border', 'border-slate-800');
      });
      btn.classList.remove('bg-slate-900', 'text-slate-300', 'border', 'border-slate-800');
      btn.classList.add('bg-cyan-600', 'text-white');

      selectedDevolucionEstado = btn.getAttribute('data-estado');
      cargarDevoluciones();
    });
  });
}

async function cargarDevoluciones() {
  const container = document.getElementById('devoluciones-list-container');
  if (container) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent mb-2"></div>
        <p class="font-bold">Cargando devoluciones...</p>
      </div>
    `;
  }

  const params = {};
  if (selectedDevolucionEstado !== 'TODAS') {
    params.estado = selectedDevolucionEstado;
  }

  const res = await API.getDevoluciones(params);
  if (res.success) {
    devolucionesCache = res.data;
    actualizarResumenDevoluciones(devolucionesCache);
    renderListaDevoluciones(devolucionesCache);
  } else {
    showToast(res.message || 'Error al obtener devoluciones', 'error');
  }
}

function actualizarResumenDevoluciones(devoluciones) {
  let totalPendiente = 0;
  let procesadasCount = 0;

  devoluciones.forEach(d => {
    const monto = Number(d.monto || 0);
    if (d.estado === 'PENDIENTE') {
      totalPendiente += monto;
    }
    if (d.estado === 'PROCESADA') {
      procesadasCount++;
    }
  });

  const summaryTotal = document.getElementById('summary-total-devolucion');
  const summaryProcesadas = document.getElementById('summary-procesadas-count');

  if (summaryTotal) summaryTotal.textContent = `$${totalPendiente.toFixed(2)}`;
  if (summaryProcesadas) summaryProcesadas.textContent = procesadasCount;
}

function renderListaDevoluciones(devoluciones) {
  const container = document.getElementById('devoluciones-list-container');
  if (!container) return;

  const searchQuery = (document.getElementById('search-devolucion-input')?.value || '').toLowerCase().trim();

  let filtered = devoluciones.filter(d => {
    if (!searchQuery) return true;
    return (d.nombre && d.nombre.toLowerCase().includes(searchQuery)) ||
           (d.telefono && d.telefono.toLowerCase().includes(searchQuery)) ||
           (d.cedula && d.cedula.toLowerCase().includes(searchQuery)) ||
           (d.banco && d.banco.toLowerCase().includes(searchQuery));
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card-warm p-8 text-center text-slate-500">
        <span class="text-4xl block mb-2">🔄</span>
        <p class="font-bold text-white text-base">No se encontraron devoluciones</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(d => {
    const esProcesada = d.estado === 'PROCESADA';
    const cleanPhone = (d.telefono || '').replace(/[^\d+]/g, '');
    const fechaReg = new Date(d.fecha_registro).toLocaleDateString('es-AR');

    let badgeHtml = `<span class="badge-amber px-2.5 py-0.5 rounded-full text-xs font-bold">⌛ Pendiente</span>`;
    if (esProcesada) {
      badgeHtml = `<span class="badge-emerald px-2.5 py-0.5 rounded-full text-xs font-bold">✓ PROCESADA</span>`;
    }

    return `
      <div class="card-warm p-4 space-y-3 ${esProcesada ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'}">
        
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 flex items-center justify-center font-black text-xl shrink-0">
              🔄
            </div>
            <div>
              <h3 class="font-bold text-white text-base leading-snug">${escapeHtml(d.nombre)}</h3>
              <p class="text-xs text-slate-400 mt-0.5">Registrado: ${fechaReg}</p>
            </div>
          </div>

          <div class="shrink-0 text-right">
            ${badgeHtml}
          </div>
        </div>

        <!-- Caja de Datos Bancarios -->
        <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">🏦 Banco / Entidad:</span>
              <span class="font-bold text-cyan-300 text-xs">${escapeHtml(d.banco)}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">🆔 Cédula / Doc:</span>
              <span class="font-mono font-bold text-slate-200 text-xs">${escapeHtml(d.cedula)}</span>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
            <span class="text-slate-400 text-[10px] uppercase font-bold">Monto a Reembolsar:</span>
            <span class="font-black text-base ${esProcesada ? 'text-emerald-400' : 'text-amber-400'}">$${Number(d.monto).toFixed(2)}</span>
          </div>
        </div>

        ${d.motivo ? `
          <p class="text-xs text-slate-400 italic bg-slate-900/40 p-2 rounded-lg border border-slate-800">📝 Motivo: ${escapeHtml(d.motivo)}</p>
        ` : ''}

        <!-- Acciones Directas (WhatsApp, Llamar, Copiar Datos y Cambiar Estado) -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          
          <div class="flex items-center gap-1.5">
            <a href="tel:${cleanPhone}" class="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 transition" title="Llamar al cliente">
              📞 <span class="hidden sm:inline">${escapeHtml(d.telefono)}</span>
            </a>
            <a href="https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(d.nombre)},%20te%20escribimos%20del%20Kiosco%20respecto%20a%20tu%20devoluci%C3%B3n" target="_blank" class="h-10 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-bold text-xs flex items-center gap-1 transition" title="WhatsApp">
              💬 WhatsApp
            </a>
            <button onclick="copiarDatosBancarios('${escapeHtml(d.nombre)}', '${escapeHtml(d.cedula)}', '${escapeHtml(d.banco)}', '${escapeHtml(d.telefono)}', '${Number(d.monto).toFixed(2)}')" class="h-10 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 font-bold text-xs flex items-center gap-1 transition" title="Copiar datos al portapapeles">
              📋 Copiar Datos
            </button>
          </div>

          <div>
            ${esProcesada ? `
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1">✓ Reembolso Completado</span>
            ` : `
              <button onclick="marcarProcesada(${d.id})" class="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1">
                <span>✓</span> Marcar Procesada
              </button>
            `}
          </div>

        </div>

      </div>
    `;
  }).join('');
}

function setupDevolucionEvents() {
  const searchInput = document.getElementById('search-devolucion-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderListaDevoluciones(devolucionesCache);
    });
  }

  const formDev = document.getElementById('devolucion-form');
  if (formDev) {
    formDev.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('dev-nombre').value;
      const telefono = document.getElementById('dev-telefono').value;
      const banco = document.getElementById('dev-banco').value;
      const cedula = document.getElementById('dev-cedula').value;
      const monto = parseFloat(document.getElementById('dev-monto').value);
      const motivo = document.getElementById('dev-motivo').value;

      if (!nombre || !telefono || !banco || !cedula) {
        showToast('Nombre, Teléfono, Banco y Cédula son requeridos', 'warning');
        return;
      }

      const res = await API.createDevolucion({ nombre, telefono, banco, cedula, monto, motivo });
      if (res.success) {
        showToast('¡Devolución registrada exitosamente!', 'success');
        closeDevolucionModal();
        cargarDevoluciones();
      } else {
        showToast(res.message || 'Error al registrar devolución', 'error');
      }
    });
  }
}

// Copiar datos bancarios al portapapeles
function copiarDatosBancarios(nombre, cedula, banco, telefono, monto) {
  const textToCopy = `NOMBRE: ${nombre}\nCÉDULA: ${cedula}\nBANCO: ${banco}\nTELÉFONO: ${telefono}\nMONTO REEMBOLSO: $${monto}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('📋 ¡Datos bancarios copiados al portapapeles!', 'success');
    }).catch(() => {
      fallbackCopyText(textToCopy);
    });
  } else {
    fallbackCopyText(textToCopy);
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('📋 ¡Datos bancarios copiados al portapapeles!', 'success');
  } catch (err) {
    showToast('No se pudo copiar automáticamente', 'warning');
  }
  document.body.removeChild(textArea);
}

// Marcar devolución como procesada
async function marcarProcesada(id) {
  if (confirm('¿Confirmas que el reembolso ya ha sido transferido al cliente?')) {
    const res = await API.updateDevolucionEstado(id, 'PROCESADA');
    if (res.success) {
      showToast('Devolución marcada como PROCESADA', 'success');
      cargarDevoluciones();
    } else {
      showToast(res.message || 'Error al actualizar estado', 'error');
    }
  }
}

async function updateAlertBadge() {
  const alertsRes = await API.getLowStockAlerts();
  if (alertsRes.success) {
    const count = alertsRes.data.length;
    const badge = document.getElementById('nav-alert-count');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}
