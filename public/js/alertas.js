let alertProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadAlerts();
  setupAlertEventListeners();
});

async function loadAlerts() {
  const container = document.getElementById('alerts-list-container');
  if (container) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-2"></div>
        <p class="font-bold">Cargando alertas de stock crítico...</p>
      </div>
    `;
  }

  const response = await API.getLowStockAlerts();

  if (response.success) {
    alertProducts = response.data;
    renderAlerts();
    updateAlertHeaderSummary();
  } else {
    showToast(response.message || 'Error al obtener alertas de reposición', 'error');
  }
}

function updateAlertHeaderSummary() {
  const countEl = document.getElementById('alert-total-count');
  if (countEl) countEl.textContent = alertProducts.length;

  const urgentCount = alertProducts.filter(p => p.stock === 0).length;
  const urgentEl = document.getElementById('alert-urgent-count');
  if (urgentEl) urgentEl.textContent = urgentCount;

  const navBadge = document.getElementById('nav-alert-count');
  if (navBadge) {
    if (alertProducts.length > 0) {
      navBadge.textContent = alertProducts.length;
      navBadge.classList.remove('hidden');
    } else {
      navBadge.classList.add('hidden');
    }
  }
}

function renderAlerts() {
  const container = document.getElementById('alerts-list-container');
  if (!container) return;

  if (alertProducts.length === 0) {
    container.innerHTML = `
      <div class="card-warm p-8 text-center rounded-3xl">
        <div class="w-16 h-16 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl font-black">
          ✓
        </div>
        <h3 class="text-lg font-black text-white mb-1">¡Excelente Estado de Inventario!</h3>
        <p class="text-slate-400 text-xs max-w-sm mx-auto">
          No hay ningún producto por debajo del nivel de stock mínimo en este momento.
        </p>
        <a href="inventario.html" class="inline-flex items-center gap-1.5 mt-4 h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs shadow-md">
          <span>Ir al Inventario Completo</span> &rarr;
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = alertProducts.map(prod => {
    const isZero = prod.stock === 0;
    const unitsNeeded = Math.max(1, (prod.min_stock * 2) - prod.stock);

    return `
      <div class="card-warm p-4 space-y-3 ${isZero ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-500'}">
        
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${isZero ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'}">
              ${isZero ? '🚨' : '⚠️'}
            </div>
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <h4 class="text-base font-bold text-white leading-snug">${escapeHtml(prod.name)}</h4>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="background-color: ${prod.category_color || '#334155'}25; color: ${prod.category_color || '#94a3b8'}; border: 1px solid ${prod.category_color || '#475569'}40;">
                  ${escapeHtml(prod.category_name || 'Sin Cat.')}
                </span>
              </div>
              <p class="text-xs text-slate-400 font-mono">
                ${prod.barcode ? '📟 ' + prod.barcode : 'Sin Código'}
              </p>
            </div>
          </div>

          <div class="shrink-0 text-right">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${isZero ? 'badge-rose font-black animate-pulse' : 'badge-amber'}">
              ${isZero ? 'AGOTADO (0)' : 'Stock Bajo'}
            </span>
          </div>
        </div>

        <!-- Detalles de Stock -->
        <div class="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Stock Actual</span>
            <span class="font-black text-sm ${isZero ? 'text-rose-400' : 'text-amber-400'}">${prod.stock} ${prod.unit || 'uds'}</span>
          </div>

          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Stock Mínimo</span>
            <span class="text-slate-200 font-bold text-sm">${prod.min_stock} ${prod.unit || 'uds'}</span>
          </div>

          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Sugerido</span>
            <span class="text-emerald-400 font-bold text-sm">+${unitsNeeded} ${prod.unit || 'uds'}</span>
          </div>
        </div>

        <!-- Acción Fat-Finger Reponer Stock -->
        <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="number" 
              id="restock-input-${prod.id}" 
              value="${unitsNeeded}" 
              min="1" 
              class="w-24 h-12 px-3 rounded-xl border border-slate-700 bg-slate-900 text-white text-center font-extrabold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
            <button 
              onclick="quickRestock(${prod.id})" 
              class="flex-1 sm:flex-none h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-1.5"
            >
              <span>➕ Reponer</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

function setupAlertEventListeners() {
  const printBtn = document.getElementById('print-alerts-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

async function quickRestock(productId) {
  const input = document.getElementById(`restock-input-${productId}`);
  if (!input) return;

  const quantity = parseInt(input.value);
  if (isNaN(quantity) || quantity <= 0) {
    showToast('Ingresa una cantidad válida para ingresar', 'warning');
    return;
  }

  const response = await API.updateStock(productId, { quantity_to_add: quantity });
  if (response.success) {
    showToast(`Reabastecido exitosamente: ${response.data.name} (+${quantity})`, 'success');
    loadAlerts();
  } else {
    showToast(response.message || 'Error al reabastecer stock', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}
