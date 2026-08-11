let currentClientes = [];

document.addEventListener('DOMContentLoaded', () => {
  loadClientes();
  setupClienteEvents();
  updateAlertBadge();
});

async function loadClientes() {
  const searchInput = document.getElementById('search-cliente');
  const search = searchInput ? searchInput.value : '';

  const container = document.getElementById('clientes-cards-container');
  if (container) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-2"></div>
        <p class="font-bold">Cargando lista de clientes...</p>
      </div>
    `;
  }

  const response = await API.getClientes(search);

  if (response.success) {
    currentClientes = response.data;
    renderClientesCards();
  } else {
    showToast(response.message || 'Error al cargar clientes', 'error');
  }
}

function renderClientesCards() {
  const container = document.getElementById('clientes-cards-container');
  if (!container) return;

  if (currentClientes.length === 0) {
    container.innerHTML = `
      <div class="card-warm p-8 text-center text-slate-500">
        <span class="text-4xl block mb-2">👥</span>
        <p class="font-bold text-white text-base">No se encontraron clientes registrados</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentClientes.map(c => {
    const deuda = parseFloat(c.deuda_total || 0);
    const tieneMora = parseInt(c.fiados_vencidos || 0) > 0;
    const cleanPhone = (c.telefono || '').replace(/[^\d+]/g, '');

    let estadoBadge = `<span class="badge-emerald px-2.5 py-0.5 rounded-full text-xs font-bold">✓ Al día</span>`;
    let deudaTextClass = 'text-emerald-400';

    if (tieneMora) {
      estadoBadge = `<span class="badge-rose px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse">🚨 ${c.fiados_vencidos} vencida(s) (+5%)</span>`;
      deudaTextClass = 'text-rose-400';
    } else if (deuda > 0) {
      estadoBadge = `<span class="badge-amber px-2.5 py-0.5 rounded-full text-xs font-bold">⚠️ Deuda Pendiente</span>`;
      deudaTextClass = 'text-amber-400';
    }

    const fechaReg = new Date(c.fecha_registro).toLocaleDateString('es-AR');

    return `
      <div class="card-warm p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center justify-center font-black text-xl shrink-0">
              👤
            </div>
            <div>
              <h3 class="font-bold text-white text-base leading-snug">${escapeHtml(c.nombre)}</h3>
              <p class="text-xs text-slate-400 mt-0.5">Registrado: ${fechaReg}</p>
            </div>
          </div>

          <div class="shrink-0 text-right">
            ${estadoBadge}
          </div>
        </div>

        <!-- Acciones Directas de Contacto & Estado -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div class="flex items-center gap-2">
            <a href="tel:${cleanPhone}" class="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 transition">
              📞 ${escapeHtml(c.telefono)}
            </a>
            <a href="https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(c.nombre)},%20te%20escribimos%20del%20Kiosco" target="_blank" class="h-10 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-bold text-xs flex items-center gap-1 transition">
              💬 WhatsApp
            </a>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-bold">Deuda: <strong class="${deudaTextClass} text-sm font-black">$${deuda.toFixed(2)}</strong></span>
            <a href="fiados.html?cliente=${c.id}" class="h-10 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 transition">
              💳 Ver Fiados
            </a>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

function setupClienteEvents() {
  const searchInput = document.getElementById('search-cliente');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadClientes, 300);
    });
  }

  document.getElementById('cliente-form')?.addEventListener('submit', handleClienteSubmit);
}

function openClienteModal() {
  const modal = document.getElementById('cliente-modal');
  if (modal) {
    document.getElementById('cliente-form').reset();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeClienteModal() {
  const modal = document.getElementById('cliente-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleClienteSubmit(e) {
  e.preventDefault();

  const clienteData = {
    nombre: document.getElementById('cliente-nombre').value,
    telefono: document.getElementById('cliente-telefono').value
  };

  const response = await API.createCliente(clienteData);
  if (response.success) {
    showToast(response.message, 'success');
    closeClienteModal();
    loadClientes();
  } else {
    showToast(response.message || 'Error al registrar cliente', 'error');
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
