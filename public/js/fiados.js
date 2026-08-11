/**
 * Lógica Frontend Mobile-First en Modo Nocturno para Cuentas Fiadas y Abonos (fiados.html)
 */

let clientesList = [];
let fiadosCache = [];
let fiadoSeleccionadoParaAbono = null;
let selectedEstadoFilter = 'TODOS';

window.openFiadoModal = function() {
  const modal = document.getElementById('fiado-modal');
  const form = document.getElementById('fiado-form');
  if (form) form.reset();
  if (modal) modal.classList.remove('hidden'), modal.classList.add('flex');
};

window.closeFiadoModal = function() {
  const modal = document.getElementById('fiado-modal');
  if (modal) modal.classList.add('hidden'), modal.classList.remove('flex');
};

window.openClienteModal = function() {
  const modal = document.getElementById('cliente-modal');
  const form = document.getElementById('cliente-form');
  if (form) form.reset();
  if (modal) modal.classList.remove('hidden'), modal.classList.add('flex');
};

window.closeClienteModal = function() {
  const modal = document.getElementById('cliente-modal');
  if (modal) modal.classList.add('hidden'), modal.classList.remove('flex');
};

window.openAbonoModal = function(id) {
  const fiado = fiadosCache.find(f => f.id === id);
  if (!fiado) return;

  fiadoSeleccionadoParaAbono = fiado;
  
  const modal = document.getElementById('abono-modal');
  const form = document.getElementById('abono-form');
  const clientName = document.getElementById('abono-cliente-name');
  const saldoActual = document.getElementById('abono-saldo-actual');
  const montoInput = document.getElementById('abono-monto');

  if (form) form.reset();
  if (clientName) clientName.textContent = `${fiado.cliente_nombre} (${fiado.cliente_telefono})`;
  if (saldoActual) saldoActual.textContent = `$${Number(fiado.monto_actual).toFixed(2)}`;
  if (montoInput) {
    montoInput.max = Number(fiado.monto_actual);
    montoInput.focus();
  }

  if (modal) modal.classList.remove('hidden'), modal.classList.add('flex');
};

window.closeAbonoModal = function() {
  const modal = document.getElementById('abono-modal');
  if (modal) modal.classList.add('hidden'), modal.classList.remove('flex');
};

window.procesarMoraManual = async function() {
  showToast('🔍 Evaluando cuentas vencidas para recargo +5%...', 'info');
  const res = await API.procesarMora();
  if (res.success) {
    if (res.procesadas > 0) {
      showToast(`¡Atención! ${res.message}`, 'warning');
    } else {
      showToast(res.message, 'success');
    }
    cargarFiados();
  } else {
    showToast('Error al evaluar recargos por mora', 'error');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initFiados();
});

async function initFiados() {
  await cargarClientesSelector();
  setupStatusPills();
  await cargarFiados();
  setupFiadosEvents();
  updateAlertBadge();
}

function setupStatusPills() {
  const container = document.getElementById('fiados-status-pills');
  if (!container) return;

  container.querySelectorAll('.fiado-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.fiado-pill').forEach(b => {
        b.classList.remove('bg-amber-500', 'text-white');
        b.classList.add('bg-slate-900', 'text-slate-300', 'border', 'border-slate-800');
      });
      btn.classList.remove('bg-slate-900', 'text-slate-300', 'border', 'border-slate-800');
      btn.classList.add('bg-amber-500', 'text-white');

      selectedEstadoFilter = btn.getAttribute('data-estado');
      cargarFiados();
    });
  });
}

async function cargarClientesSelector(selectedId = null) {
  const res = await API.getClientes();
  if (res.success) {
    clientesList = res.data;
    const selectFiadoCliente = document.getElementById('fiado-cliente');
    if (selectFiadoCliente) {
      selectFiadoCliente.innerHTML = '<option value="">Selecciona un Cliente *</option>' +
        clientesList.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)} - Tel: ${escapeHtml(c.telefono)}</option>`).join('');

      if (selectedId) {
        selectFiadoCliente.value = selectedId;
      }
    }
  }
}

async function cargarFiados() {
  const listContainer = document.getElementById('fiados-list-container');
  if (listContainer) {
    listContainer.innerHTML = `
      <div class="py-12 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-2"></div>
        <p class="font-bold">Cargando cuentas fiadas...</p>
      </div>
    `;
  }

  const params = {};
  if (selectedEstadoFilter !== 'TODOS') {
    params.estado = selectedEstadoFilter;
  }

  const res = await API.getFiados(params);
  if (res.success) {
    fiadosCache = res.data;
    actualizarResumen(fiadosCache);
    renderListaFiados(fiadosCache);
  } else {
    showToast(res.message || 'Error al obtener cuentas fiadas', 'error');
  }
}

function actualizarResumen(fiados) {
  let totalPendiente = 0;
  let vencidosCount = 0;

  fiados.forEach(f => {
    const monto = Number(f.monto_actual || 0);
    if (f.estado === 'PENDIENTE' || f.estado === 'VENCIDO') {
      totalPendiente += monto;
    }
    if (f.estado === 'VENCIDO') {
      vencidosCount++;
    }
  });

  const summaryTotalFiado = document.getElementById('summary-total-fiado');
  const summaryVencidosCount = document.getElementById('summary-vencidos-count');

  if (summaryTotalFiado) summaryTotalFiado.textContent = `$${totalPendiente.toFixed(2)}`;
  if (summaryVencidosCount) summaryVencidosCount.textContent = vencidosCount;
}

function renderListaFiados(fiados) {
  const listContainer = document.getElementById('fiados-list-container');
  if (!listContainer) return;

  const searchQuery = (document.getElementById('search-fiado-input')?.value || '').toLowerCase().trim();

  let filtered = fiados.filter(f => {
    if (!searchQuery) return true;
    return (f.cliente_nombre && f.cliente_nombre.toLowerCase().includes(searchQuery)) ||
           (f.cliente_telefono && f.cliente_telefono.toLowerCase().includes(searchQuery));
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="card-warm p-8 text-center text-slate-500">
        <span class="text-3xl block mb-2">💳</span>
        <p class="font-bold text-white text-base">No se encontraron cuentas fiadas</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(f => {
    const esVencido = f.estado === 'VENCIDO';
    const esSaldado = f.estado === 'PAGADO' || Number(f.monto_actual) <= 0;
    const cleanPhone = (f.cliente_telefono || '').replace(/[^\d+]/g, '');

    let badgeHtml = `<span class="badge-amber px-2.5 py-0.5 rounded-full text-xs font-bold">⌛ Pendiente</span>`;
    if (esVencido) {
      badgeHtml = `<span class="badge-rose px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse">🚨 +5% Recargo Aplicado</span>`;
    } else if (esSaldado) {
      badgeHtml = `<span class="badge-emerald px-2.5 py-0.5 rounded-full text-xs font-bold">✓ PAGADO</span>`;
    }

    const fechaEmi = new Date(f.fecha_emision).toLocaleDateString('es-AR');
    const fechaVenc = new Date(f.fecha_vencimiento).toLocaleDateString('es-AR');
    const abonos = f.abonos || [];

    return `
      <div class="card-warm p-4 space-y-3 ${esVencido ? 'border-2 border-rose-500/60' : ''}">
        
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl ${esVencido ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'} flex items-center justify-center font-black text-xl shrink-0">
              💳
            </div>
            <div>
              <h3 class="font-bold text-white text-base leading-snug">${escapeHtml(f.cliente_nombre)}</h3>
              <!-- Botones Directos WhatsApp / Llamada -->
              <div class="flex items-center gap-2 mt-1">
                <a href="tel:${cleanPhone}" class="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition" title="Llamar al cliente">
                  📞 <span class="hidden sm:inline">${escapeHtml(f.cliente_telefono)}</span>
                </a>
                <a href="https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(f.cliente_nombre)},%20te%20escribimos%20del%20Kiosco%20por%20tu%20cuenta%20fiada" target="_blank" class="h-8 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 text-xs font-bold flex items-center gap-1 transition" title="Enviar WhatsApp">
                  💬 WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div class="shrink-0 text-right">
            ${badgeHtml}
          </div>
        </div>

        <!-- Resumen de Saldo y Vencimiento -->
        <div class="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Emisión</span>
            <span class="text-slate-200 font-bold text-xs">${fechaEmi}</span>
          </div>

          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Vencimiento</span>
            <span class="text-slate-200 font-bold text-xs">${fechaVenc}</span>
          </div>

          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Saldo Deuda</span>
            <span class="font-black text-base ${esSaldado ? 'text-emerald-400' : esVencido ? 'text-rose-400' : 'text-amber-400'}">
              $${Number(f.monto_actual).toFixed(2)}
            </span>
          </div>
        </div>

        ${f.notas ? `
          <p class="text-xs text-slate-300 italic bg-slate-900/40 p-2 rounded-lg border border-slate-800">📝 ${escapeHtml(f.notas)}</p>
        ` : ''}

        ${abonos.length > 0 ? `
          <div class="pt-1 text-xs text-slate-400 space-y-1">
            <span class="font-bold text-slate-200">Abonos realizados:</span>
            ${abonos.map(a => `
              <div class="flex justify-between text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span>• ${new Date(a.fecha_abono).toLocaleDateString('es-AR')}</span>
                <span class="font-bold text-emerald-400">+$${Number(a.monto).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Botón Directo Fat-Finger "Registrar Abono" -->
        <div class="pt-2 flex justify-end">
          ${esSaldado ? `
            <span class="text-xs font-bold text-emerald-400 flex items-center gap-1">✓ Deuda Completamente Saldada</span>
          ` : `
            <button onclick="openAbonoModal(${f.id})" class="h-12 w-full sm:w-auto px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2">
              <span>💵</span> Registrar Abono
            </button>
          `}
        </div>

      </div>
    `;
  }).join('');
}

function setupFiadosEvents() {
  const searchInput = document.getElementById('search-fiado-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderListaFiados(fiadosCache);
    });
  }

  // Submit crear cliente rápido desde modal de fiados
  const formCliente = document.getElementById('cliente-form');
  if (formCliente) {
    formCliente.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('cliente-nombre').value;
      const telefono = document.getElementById('cliente-telefono').value;

      const res = await API.createCliente({ nombre, telefono });
      if (res.success) {
        showToast('¡Cliente registrado con éxito!', 'success');
        closeClienteModal();
        await cargarClientesSelector(res.data.id);
      } else {
        showToast(res.message || 'Error al registrar cliente', 'error');
      }
    });
  }

  const formFiado = document.getElementById('fiado-form');
  if (formFiado) {
    formFiado.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cliente_id = parseInt(document.getElementById('fiado-cliente').value);
      const monto_inicial = parseFloat(document.getElementById('fiado-monto').value);
      const notas = document.getElementById('fiado-notas').value.trim();

      if (!cliente_id) {
        showToast('Selecciona un cliente obligatoriamente', 'warning');
        return;
      }

      if (isNaN(monto_inicial) || monto_inicial <= 0) {
        showToast('Ingresa un monto válido mayor a 0', 'warning');
        return;
      }

      const res = await API.createFiado({ cliente_id, monto_inicial, notas });
      if (res.success) {
        showToast('¡Deuda fiada registrada con éxito!', 'success');
        closeFiadoModal();
        cargarFiados();
      } else {
        showToast(res.message || 'Error al registrar la deuda', 'error');
      }
    });
  }

  const formAbono = document.getElementById('abono-form');
  if (formAbono) {
    formAbono.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fiadoSeleccionadoParaAbono) return;

      const monto = parseFloat(document.getElementById('abono-monto').value);

      if (isNaN(monto) || monto <= 0) {
        showToast('Ingresa un monto de abono válido mayor a 0', 'warning');
        return;
      }

      const res = await API.abonarFiado(fiadoSeleccionadoParaAbono.id, { monto });
      if (res.success) {
        showToast(res.message, 'success');
        closeAbonoModal();
        cargarFiados();
      } else {
        showToast(res.message || 'Error al registrar abono', 'error');
      }
    });
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
