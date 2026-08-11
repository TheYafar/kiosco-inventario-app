/**
 * Lógica del Punto de Venta (POS / Caja) - dashboard.js
 * Mobile-First, Carrito interactivo táctil, Cobro rápido (Efectivo/Transferencia/Fiado)
 */

let allProducts = [];
let allCategories = [];
let clientesList = [];
let cart = []; // [{ product, quantity }]
let selectedCategory = 'all';
let selectedPaymentMethod = 'efectivo';

document.addEventListener('DOMContentLoaded', () => {
  initPOS();
});

async function initPOS() {
  await loadCategories();
  await loadProducts();
  await loadClientes();
  setupPOSEvents();
  updateAlertBadge();
}

// Cargar categorías para pills
async function loadCategories() {
  const res = await API.getCategories();
  if (res.success) {
    allCategories = res.data;
    renderCategoryPills();
  }
}

function renderCategoryPills() {
  const container = document.getElementById('pos-category-pills');
  if (!container) return;

  const pillsHtml = allCategories.map(cat => `
    <button 
      class="cat-pill h-10 px-4 rounded-xl font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 shrink-0 shadow-xs transition" 
      data-category="${cat.id}"
    >
      ${cat.name}
    </button>
  `).join('');

  container.innerHTML = `
    <button class="cat-pill h-10 px-4 rounded-xl font-bold bg-emerald-600 text-white shrink-0 shadow-xs transition" data-category="all">
      ✨ Todos
    </button>
    ${pillsHtml}
  `;

  // Attach click events to category pills
  container.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cat-pill').forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white');
        b.classList.add('bg-white', 'text-slate-700', 'border', 'border-slate-200');
      });
      btn.classList.remove('bg-white', 'text-slate-700', 'border', 'border-slate-200');
      btn.classList.add('bg-emerald-600', 'text-white');

      selectedCategory = btn.getAttribute('data-category');
      renderProductGrid();
    });
  });
}

// Cargar Productos desde API
async function loadProducts() {
  const res = await API.getProducts();
  if (res.success) {
    allProducts = res.data;
    renderProductGrid();
  } else {
    showToast(res.message || 'Error al obtener productos', 'error');
  }
}

// Cargar Clientes para fiado
async function loadClientes() {
  const res = await API.getClientes();
  if (res.success) {
    clientesList = res.data;
    const select = document.getElementById('cart-fiado-cliente-select');
    if (select) {
      select.innerHTML = '<option value="">Selecciona un cliente obligatoriamente *</option>' +
        clientesList.map(c => `<option value="${c.id}">${c.nombre} (${c.telefono})</option>`).join('');
    }
  }
}

// Renderizar Cuadrícula Táctil de Productos (2 columnas en celular)
function renderProductGrid() {
  const grid = document.getElementById('pos-product-grid');
  if (!grid) return;

  const searchQuery = (document.getElementById('pos-search-input')?.value || '').toLowerCase().trim();

  let filtered = allProducts.filter(p => {
    const matchCat = selectedCategory === 'all' || String(p.category_id) === String(selectedCategory);
    const matchSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery) || 
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500">
        <span class="text-4xl block mb-2">🔍</span>
        <p class="font-bold text-slate-700 text-base">No se encontraron productos</p>
        <p class="text-xs text-slate-500 mt-1">Prueba cambiando la búsqueda o seleccionando otra categoría.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(prod => {
    const isOutOfStock = prod.stock === 0;
    const isLowStock = prod.stock <= prod.min_stock;
    const priceFormatted = `$${parseFloat(prod.price).toFixed(2)}`;

    // Stock Badge
    let stockBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let stockText = `${prod.stock} uds`;

    if (isOutOfStock) {
      stockBadgeClass = 'bg-rose-100 text-rose-700 border-rose-200 font-bold';
      stockText = 'AGOTADO';
    } else if (isLowStock) {
      stockBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200 font-semibold';
      stockText = `⚠️ ${prod.stock} uds`;
    }

    return `
      <div class="card-warm p-3.5 flex flex-col justify-between h-full space-y-3 relative group">
        <div>
          <div class="flex items-center justify-between gap-1 mb-1.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[110px]" style="background-color: ${prod.category_color || '#e2e8f0'}25; color: ${prod.category_color || '#475569'}; border: 1px solid ${prod.category_color || '#cbd5e1'}40;">
              ${prod.category_name || 'Sin cat.'}
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full border ${stockBadgeClass} shrink-0">
              ${stockText}
            </span>
          </div>

          <h3 class="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 min-h-[40px]">
            ${escapeHtml(prod.name)}
          </h3>

          ${prod.barcode ? `
            <p class="text-[10px] font-mono text-slate-400 mt-0.5">📟 ${prod.barcode}</p>
          ` : ''}
        </div>

        <div class="space-y-2 pt-1 border-t border-slate-100">
          <div class="flex items-baseline justify-between">
            <span class="text-[10px] text-slate-400 uppercase font-semibold">Precio</span>
            <span class="text-base sm:text-lg font-black text-emerald-600">${priceFormatted}</span>
          </div>

          <button 
            onclick="addToCart(${prod.id})"
            ${isOutOfStock ? 'disabled' : ''}
            class="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:scale-100 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>${isOutOfStock ? '❌ Sin Stock' : '➕ Agregar'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Configurar Listeners del POS
function setupPOSEvents() {
  const searchInput = document.getElementById('pos-search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (clearBtn) {
        if (searchInput.value.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
      renderProductGrid();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      clearBtn.classList.add('hidden');
      renderProductGrid();
    });
  }

  // Cards selector de método de pago
  document.querySelectorAll('.payment-method-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-method-card').forEach(c => {
        c.classList.remove('border-emerald-500', 'bg-emerald-50/50', 'border-cyan-500', 'bg-cyan-50/50', 'border-amber-500', 'bg-amber-50/50');
        c.classList.add('border-slate-200', 'bg-white');
      });

      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      selectedPaymentMethod = card.getAttribute('data-method');

      if (selectedPaymentMethod === 'efectivo') {
        card.classList.remove('border-slate-200', 'bg-white');
        card.classList.add('border-emerald-500', 'bg-emerald-50/50');
      } else if (selectedPaymentMethod === 'transferencia') {
        card.classList.remove('border-slate-200', 'bg-white');
        card.classList.add('border-cyan-500', 'bg-cyan-50/50');
      } else if (selectedPaymentMethod === 'fiado') {
        card.classList.remove('border-slate-200', 'bg-white');
        card.classList.add('border-amber-500', 'bg-amber-50/50');
      }

      // Desplegar selector de cliente si es fiado
      const fiadoContainer = document.getElementById('cart-fiado-cliente-container');
      if (fiadoContainer) {
        if (selectedPaymentMethod === 'fiado') {
          fiadoContainer.classList.remove('hidden');
        } else {
          fiadoContainer.classList.add('hidden');
        }
      }
    });
  });
}

// Agregar Producto al Carrito
function addToCart(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.product.id === productId);

  if (existing) {
    if (existing.quantity >= prod.stock) {
      showToast(`¡No hay más unidades en stock de ${prod.name}!`, 'warning');
      return;
    }
    existing.quantity++;
  } else {
    if (prod.stock < 1) {
      showToast(`El producto ${prod.name} está agotado`, 'warning');
      return;
    }
    cart.push({ product: prod, quantity: 1 });
  }

  showToast(`+1 ${prod.name} agregado`, 'success');
  updateCartUI();
}

// Modificar Cantidad en el Carrito
function updateCartItemQty(productId, delta) {
  const index = cart.findIndex(item => item.product.id === productId);
  if (index === -1) return;

  const item = cart[index];
  const newQty = item.quantity + delta;

  if (newQty > item.product.stock) {
    showToast(`Stock máximo disponible: ${item.product.stock} unidades`, 'warning');
    return;
  }

  if (newQty <= 0) {
    cart.splice(index, 1);
  } else {
    item.quantity = newQty;
  }

  updateCartUI();
}

function removeCartItem(productId) {
  cart = cart.filter(item => item.product.id !== productId);
  updateCartUI();
}

// Actualizar UI del Carrito y Barra Flotante
function updateCartUI() {
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce((sum, i) => sum + (parseFloat(i.product.price) * i.quantity), 0);
  const totalFormatted = `$${totalPrice.toFixed(2)}`;

  // Barra flotante inferior
  const badge = document.getElementById('floating-cart-badge');
  const summary = document.getElementById('floating-cart-summary');
  const tagTotal = document.getElementById('btn-pos-total-tag');

  if (badge) badge.textContent = totalItems;
  if (summary) summary.textContent = `${totalItems} ítem(s) - ${totalFormatted}`;
  if (tagTotal) tagTotal.textContent = totalFormatted;

  // Renderizar modal de carrito
  renderCartModalItems(totalPrice);
}

function renderCartModalItems(totalPrice) {
  const list = document.getElementById('cart-items-list');
  const modalTotal = document.getElementById('modal-cart-total');

  if (modalTotal) modalTotal.textContent = `$${totalPrice.toFixed(2)}`;

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="py-8 text-center text-slate-400">
        <span class="text-3xl block mb-1">🛒</span>
        <p class="font-semibold text-slate-600 text-sm">El carrito está vacío</p>
        <p class="text-xs text-slate-400 mt-1">Selecciona productos para comenzar la venta.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = cart.map(item => {
    const subtotal = (parseFloat(item.product.price) * item.quantity).toFixed(2);

    return `
      <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 gap-3">
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-slate-900 text-sm truncate">${escapeHtml(item.product.name)}</h4>
          <p class="text-xs text-slate-500 font-semibold">$${parseFloat(item.product.price).toFixed(2)} c/u &bull; <strong class="text-emerald-600">$${subtotal}</strong></p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button onclick="updateCartItemQty(${item.product.id}, -1)" class="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 font-black text-lg flex items-center justify-center active:scale-95 transition">-</button>
          <span class="font-black text-slate-900 text-base w-6 text-center">${item.quantity}</span>
          <button onclick="updateCartItemQty(${item.product.id}, 1)" class="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 font-black text-lg flex items-center justify-center active:scale-95 transition">+</button>
          <button onclick="removeCartItem(${item.product.id})" class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-base flex items-center justify-center transition" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// Abrir / Cerrar Modal de Carrito
function openCartModal() {
  if (cart.length === 0) {
    showToast('El carrito está vacío. Agrega al menos 1 producto.', 'warning');
    return;
  }
  const modal = document.getElementById('cart-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  updateCartUI();
}

function closeCartModal() {
  const modal = document.getElementById('cart-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// PROCESAR COBRO / COBRAR
async function processCheckout() {
  if (cart.length === 0) {
    showToast('No hay productos en el carrito', 'warning');
    return;
  }

  const totalAmount = cart.reduce((sum, i) => sum + (parseFloat(i.product.price) * i.quantity), 0);

  // Si es fiado, validar que seleccionó un cliente
  if (selectedPaymentMethod === 'fiado') {
    const clienteSelect = document.getElementById('cart-fiado-cliente-select');
    const clienteId = clienteSelect ? parseInt(clienteSelect.value) : null;

    if (!clienteId) {
      showToast('Para cobro Fiado debes seleccionar un cliente de la lista', 'warning');
      return;
    }

    const itemsSummary = cart.map(i => `${i.quantity}x ${i.product.name}`).join(', ');

    const fiadoRes = await API.createFiado({
      cliente_id: clienteId,
      monto_inicial: totalAmount,
      notas: `Venta POS (${itemsSummary})`
    });

    if (!fiadoRes.success) {
      showToast(fiadoRes.message || 'Error al registrar la deuda fiada', 'error');
      return;
    }

    // Descontar stock de cada producto en el backend
    for (const item of cart) {
      await API.updateStock(item.product.id, { quantity_to_add: -item.quantity });
    }

    showToast(`🎉 ¡Venta Fiada cobrada exitosamente por $${totalAmount.toFixed(2)}!`, 'success');

  } else {
    // Cobro en Efectivo o Transferencia
    for (const item of cart) {
      await API.updateStock(item.product.id, { quantity_to_add: -item.quantity });
    }

    showToast(`🎉 ¡Cobro exitoso de $${totalAmount.toFixed(2)} (${selectedPaymentMethod.toUpperCase()})!`, 'success');
  }

  // Limpiar Carrito y recargar productos
  cart = [];
  closeCartModal();
  await loadProducts();
  updateCartUI();
  updateAlertBadge();
}

// Actualizar badge de alerta en la nav
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

// Helper Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[match]));
}
