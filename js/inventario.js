let currentProducts = [];
let currentCategories = [];
let editingProductId = null;
let editingCategoryId = null;
let selectedCategoryFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initInventario();
});

async function initInventario() {
  await loadCategories();
  
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam) {
    selectedCategoryFilter = catParam;
  }

  await loadProducts();
  setupEventListeners();
  updateAlertBadge();
}

// Cargar Categorías en Selects y Category Pills
async function loadCategories() {
  const response = await API.getCategories();
  if (response.success) {
    currentCategories = response.data;
    populateCategoryDropdowns();
    renderCategoryPills();
    renderCategoriesList();
  }
}

function renderCategoryPills() {
  const container = document.getElementById('inv-category-pills');
  if (!container) return;

  const pillsHtml = currentCategories.map(cat => `
    <button 
      class="inv-cat-pill h-10 px-4 rounded-xl font-bold bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 shrink-0 shadow-xs transition ${String(cat.id) === String(selectedCategoryFilter) ? 'bg-emerald-600 text-white border-0' : ''}" 
      data-category="${cat.id}"
    >
      ${cat.name}
    </button>
  `).join('');

  container.innerHTML = `
    <button class="inv-cat-pill h-10 px-4 rounded-xl font-bold ${selectedCategoryFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'} shrink-0 shadow-xs transition" data-category="all">
      ✨ Todos
    </button>
    ${pillsHtml}
  `;

  container.querySelectorAll('.inv-cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.inv-cat-pill').forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white', 'border-0');
        b.classList.add('bg-slate-900', 'text-slate-300', 'border', 'border-slate-800');
      });
      btn.classList.remove('bg-slate-900', 'text-slate-300', 'border', 'border-slate-800');
      btn.classList.add('bg-emerald-600', 'text-white');

      selectedCategoryFilter = btn.getAttribute('data-category');
      loadProducts();
    });
  });
}

function populateCategoryDropdowns() {
  const prodCatSelect = document.getElementById('prod-category');

  const optionsHtml = currentCategories.map(cat => `
    <option value="${cat.id}">${cat.name}</option>
  `).join('');

  if (prodCatSelect) {
    prodCatSelect.innerHTML = '<option value="">Sin Categoría</option>' + optionsHtml;
  }
}

// Cargar Productos desde la API
async function loadProducts() {
  const search = document.getElementById('search-input')?.value || '';
  const category_id = selectedCategoryFilter;
  const stock_status = document.getElementById('filter-stock')?.value || 'all';

  const container = document.getElementById('products-cards-container');
  if (container) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-2"></div>
        <p class="font-bold">Cargando inventario...</p>
      </div>
    `;
  }

  const response = await API.getProducts({ search, category_id, stock_status });

  if (response.success) {
    currentProducts = response.data;
    renderProductsCards();
    updateInventorySummary();
  } else {
    showToast(response.message || 'Error al cargar inventario', 'error');
  }
}

// Renderizar Productos en Tarjetas Apiladas Nocturnas
function renderProductsCards() {
  const container = document.getElementById('products-cards-container');
  if (!container) return;

  if (currentProducts.length === 0) {
    container.innerHTML = `
      <div class="card-warm p-8 text-center text-slate-500">
        <span class="text-4xl block mb-2">🔍</span>
        <p class="font-bold text-white text-base">No se encontraron productos</p>
        <p class="text-xs text-slate-400 mt-1">Ajusta los filtros de búsqueda o agrega un nuevo producto.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentProducts.map(prod => {
    const isLowStock = prod.stock <= prod.min_stock;
    const isOutOfStock = prod.stock === 0;

    let stockBadgeClass = 'badge-emerald';
    let stockText = `${prod.stock} ${prod.unit || 'uds'}`;

    if (isOutOfStock) {
      stockBadgeClass = 'badge-rose font-black';
      stockText = `AGOTADO (0)`;
    } else if (isLowStock) {
      stockBadgeClass = 'badge-amber font-bold';
      stockText = `⚠️ ${prod.stock} ${prod.unit || 'uds'}`;
    }

    const priceFormatted = `$${parseFloat(prod.price).toFixed(2)}`;
    const costFormatted = `$${parseFloat(prod.cost).toFixed(2)}`;

    return `
      <div class="card-warm p-4 space-y-3">
        
        <!-- Header de la tarjeta -->
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1" style="background-color: ${prod.category_color || '#334155'}25; color: ${prod.category_color || '#94a3b8'}; border: 1px solid ${prod.category_color || '#475569'}40;">
              ${prod.category_name || 'Sin Categoría'}
            </span>
            <h3 class="font-bold text-white text-base leading-snug">${escapeHtml(prod.name)}</h3>
            <p class="text-xs font-mono text-slate-400 mt-0.5">${prod.barcode ? '📟 ' + prod.barcode : 'Sin Código'}</p>
          </div>

          <span class="px-3 py-1 rounded-full text-xs shrink-0 ${stockBadgeClass}">
            ${stockText}
          </span>
        </div>

        <!-- Detalles de Precios y Costos -->
        <div class="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Precio Venta</span>
            <span class="text-emerald-400 font-extrabold text-sm">${priceFormatted}</span>
          </div>

          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Costo</span>
            <span class="text-slate-200 font-bold text-sm">${costFormatted}</span>
          </div>

          <div>
            <span class="text-slate-400 block uppercase font-semibold text-[10px]">Stock Mínimo</span>
            <span class="text-white font-bold text-sm">${prod.min_stock} uds</span>
          </div>
        </div>

        <!-- Acciones Táctiles y Control Rápido de Stock -->
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          
          <!-- Ajuste Rápido de Stock (+ / - h-12) -->
          <div class="flex items-center gap-1">
            <button onclick="quickAdjustStock(${prod.id}, -1)" class="w-12 h-12 rounded-xl bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-200 font-black text-xl flex items-center justify-center border border-slate-700 transition" title="Restar 1">-</button>
            <span class="px-3 text-sm font-black text-white min-w-[36px] text-center">${prod.stock}</span>
            <button onclick="quickAdjustStock(${prod.id}, 1)" class="w-12 h-12 rounded-xl bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 text-slate-200 font-black text-xl flex items-center justify-center border border-slate-700 transition" title="Sumar 1">+</button>
          </div>

          <!-- Botones Editar y Eliminar (h-12 Fat Finger) -->
          <div class="flex items-center gap-2">
            <button onclick="openProductModal(${prod.id})" class="h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center gap-1 transition">
              <span>✏️</span> Editar
            </button>
            <button onclick="confirmDeleteProduct(${prod.id}, '${prod.name.replace(/'/g, "\\'")}')" class="w-12 h-12 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-base border border-rose-800/60 flex items-center justify-center transition" title="Eliminar">
              🗑️
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

function updateInventorySummary() {
  const totalCountEl = document.getElementById('inv-total-count');
  if (totalCountEl) totalCountEl.textContent = currentProducts.length;

  const lowCount = currentProducts.filter(p => p.stock <= p.min_stock).length;
  const lowCountEl = document.getElementById('inv-low-count');
  if (lowCountEl) lowCountEl.textContent = lowCount;
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadProducts, 300);
    });
  }

  document.getElementById('filter-stock')?.addEventListener('change', loadProducts);
  document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('category-form')?.addEventListener('submit', handleCategorySubmit);

  setupDropZone();
}

async function quickAdjustStock(id, delta) {
  const response = await API.updateStock(id, { quantity_to_add: delta });
  if (response.success) {
    showToast(`Stock de ${response.data.name}: ${response.data.stock}`, 'success');
    loadProducts();
    updateAlertBadge();
  } else {
    showToast(response.message || 'Error al actualizar stock', 'error');
  }
}

function openProductModal(productId = null) {
  editingProductId = productId;
  const modal = document.getElementById('product-modal');
  const modalTitle = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');

  if (!modal || !form) return;
  form.reset();

  if (productId) {
    const prod = currentProducts.find(p => p.id === productId);
    if (prod) {
      modalTitle.textContent = '✏️ Editar Producto';
      document.getElementById('prod-barcode').value = prod.barcode || '';
      document.getElementById('prod-name').value = prod.name;
      document.getElementById('prod-description').value = prod.description || '';
      document.getElementById('prod-category').value = prod.category_id || '';
      document.getElementById('prod-price').value = prod.price;
      document.getElementById('prod-cost').value = prod.cost;
      document.getElementById('prod-stock').value = prod.stock;
      document.getElementById('prod-min-stock').value = prod.min_stock;
      document.getElementById('prod-unit').value = prod.unit || 'unidades';
    }
  } else {
    modalTitle.textContent = '➕ Nuevo Producto';
    document.getElementById('prod-min-stock').value = 5;
    document.getElementById('prod-stock').value = 0;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  editingProductId = null;
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const productData = {
    barcode: document.getElementById('prod-barcode').value,
    name: document.getElementById('prod-name').value,
    description: document.getElementById('prod-description').value,
    category_id: document.getElementById('prod-category').value,
    price: document.getElementById('prod-price').value,
    cost: document.getElementById('prod-cost').value,
    stock: document.getElementById('prod-stock').value,
    min_stock: document.getElementById('prod-min-stock').value,
    unit: document.getElementById('prod-unit').value
  };

  let response;
  if (editingProductId) {
    response = await API.updateProduct(editingProductId, productData);
  } else {
    response = await API.createProduct(productData);
  }

  if (response.success) {
    showToast(response.message, 'success');
    closeProductModal();
    loadProducts();
    updateAlertBadge();
  } else {
    showToast(response.message || 'Error al guardar producto', 'error');
  }
}

async function confirmDeleteProduct(id, name) {
  if (confirm(`¿Eliminar "${name}" del inventario?`)) {
    const response = await API.deleteProduct(id);
    if (response.success) {
      showToast('Producto eliminado exitosamente', 'success');
      loadProducts();
      updateAlertBadge();
    } else {
      showToast(response.message || 'Error al eliminar el producto', 'error');
    }
  }
}

function openCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  resetCategoryForm();
  renderCategoriesList();
}

function closeCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  resetCategoryForm();
}

function resetCategoryForm() {
  editingCategoryId = null;
  const form = document.getElementById('category-form');
  if (form) form.reset();
  const title = document.getElementById('category-form-title');
  if (title) title.textContent = '➕ Agregar Nueva Categoría';
  const submitBtn = document.getElementById('category-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Guardar Categoría';
}

function editCategory(id) {
  const cat = currentCategories.find(c => c.id === id);
  if (!cat) return;

  editingCategoryId = id;
  document.getElementById('cat-name').value = cat.name;
  document.getElementById('cat-description').value = cat.description || '';
  document.getElementById('cat-color').value = cat.color_code || '#10b981';

  document.getElementById('category-form-title').textContent = '✏️ Editar Categoría';
  document.getElementById('category-submit-btn').textContent = 'Actualizar Categoría';
}

async function handleCategorySubmit(e) {
  e.preventDefault();

  const categoryData = {
    name: document.getElementById('cat-name').value,
    description: document.getElementById('cat-description').value,
    color_code: document.getElementById('cat-color').value
  };

  let response;
  if (editingCategoryId) {
    response = await API.updateCategory(editingCategoryId, categoryData);
  } else {
    response = await API.createCategory(categoryData);
  }

  if (response.success) {
    showToast(response.message, 'success');
    resetCategoryForm();
    await loadCategories();
    await loadProducts();
  } else {
    showToast(response.message || 'Error al guardar categoría', 'error');
  }
}

async function deleteCategory(id, name) {
  if (confirm(`¿Eliminar la categoría "${name}"?`)) {
    const response = await API.deleteCategory(id);
    if (response.success) {
      showToast('Categoría eliminada', 'success');
      await loadCategories();
      await loadProducts();
    } else {
      showToast(response.message || 'Error al eliminar categoría', 'error');
    }
  }
}

function renderCategoriesList() {
  const listEl = document.getElementById('categories-list');
  if (!listEl) return;

  if (currentCategories.length === 0) {
    listEl.innerHTML = `<p class="text-slate-400 text-xs text-center py-4">No hay categorías registradas.</p>`;
    return;
  }

  listEl.innerHTML = currentCategories.map(cat => `
    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
      <div class="flex items-center gap-2.5">
        <span class="w-4 h-4 rounded-full border border-black/10" style="background-color: ${cat.color_code}"></span>
        <div>
          <h5 class="font-bold text-xs text-white">${escapeHtml(cat.name)}</h5>
          <p class="text-[11px] text-slate-400">${escapeHtml(cat.description || 'Sin descripción')}</p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="editCategory(${cat.id})" class="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 font-bold hover:bg-slate-700 transition">✏️</button>
        <button onclick="deleteCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')" class="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 font-bold hover:bg-rose-900/80 transition">🗑️</button>
      </div>
    </div>
  `).join('');
}

// CSV and Clear logic
let parsedImportProducts = [];

function setupDropZone() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-file-input');

  if (!dropZone || !fileInput) return;
  dropZone.onclick = (e) => { if (e.target !== fileInput) fileInput.click(); };

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-cyan-400', 'bg-cyan-950/20'); });
  dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-cyan-400', 'bg-cyan-950/20'); });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-cyan-400', 'bg-cyan-950/20');
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      processSelectedFile(e.dataTransfer.files[0]);
    }
  });
}

function handleFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) processSelectedFile(e.target.files[0]);
}

function processSelectedFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => parseAndPreviewCSV(e.target.result, file.name);
  reader.readAsText(file, 'UTF-8');
}

function parseAndPreviewCSV(csvText, filename) {
  if (!csvText || csvText.trim() === '') {
    showToast('El archivo CSV está vacío', 'error');
    return;
  }

  let cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length < 2) {
    showToast('El archivo debe contener encabezados y al menos 1 fila de datos', 'error');
    return;
  }

  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const parseRow = (rowStr) => {
    const pattern = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^"${delimiter}]*))`, 'g');
    const result = [];
    let match;
    while ((match = pattern.exec(rowStr)) !== null) {
      let val = match[1] !== undefined ? match[1] : match[2];
      result.push(val ? val.trim() : '');
    }
    return result;
  };

  const rawHeaders = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_\-]/g, ''));
  const findHeaderIndex = (aliases) => rawHeaders.findIndex(h => aliases.some(alias => h.includes(alias)));

  const barcodeIdx = findHeaderIndex(['codigobarras', 'codigo', 'barcode', 'sku']);
  const nameIdx = findHeaderIndex(['nombre', 'name', 'producto']);
  const descIdx = findHeaderIndex(['descripcion', 'desc']);
  const catIdx = findHeaderIndex(['categoria', 'grupo']);
  const priceIdx = findHeaderIndex(['precioventa', 'precio']);
  const costIdx = findHeaderIndex(['costo', 'cost']);
  const stockIdx = findHeaderIndex(['stockactual', 'stock']);
  const minStockIdx = findHeaderIndex(['stockminimo', 'minimo']);
  const unitIdx = findHeaderIndex(['unidad', 'unit']);

  if (nameIdx === -1) {
    showToast('No se encontró la columna "Nombre" en el archivo CSV', 'error');
    return;
  }

  parsedImportProducts = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const nameVal = cols[nameIdx];
    if (!nameVal || nameVal.trim() === '') continue;

    parsedImportProducts.push({
      barcode: barcodeIdx !== -1 ? cols[barcodeIdx] : '',
      name: nameVal.trim(),
      description: descIdx !== -1 ? cols[descIdx] : '',
      category_name: catIdx !== -1 ? cols[catIdx] : '',
      price: priceIdx !== -1 ? parseFloat(cols[priceIdx].replace(',', '.')) || 0 : 0,
      cost: costIdx !== -1 ? parseFloat(cols[costIdx].replace(',', '.')) || 0 : 0,
      stock: stockIdx !== -1 ? parseInt(cols[stockIdx]) || 0 : 0,
      min_stock: minStockIdx !== -1 ? parseInt(cols[minStockIdx]) || 5 : 5,
      unit: unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx] : 'unidades'
    });
  }

  const previewContainer = document.getElementById('import-preview-container');
  const previewCount = document.getElementById('preview-count');
  const previewFilename = document.getElementById('preview-filename');
  const tbody = document.getElementById('preview-table-body');
  const btnProcess = document.getElementById('btn-process-import');

  if (previewContainer) previewContainer.classList.remove('hidden');
  if (previewCount) previewCount.textContent = parsedImportProducts.length;
  if (previewFilename) previewFilename.textContent = filename || 'archivo.csv';
  if (btnProcess) btnProcess.disabled = false;

  if (tbody) {
    tbody.innerHTML = parsedImportProducts.slice(0, 5).map(p => `
      <tr class="border-b border-slate-800">
        <td class="p-2 text-slate-400 font-mono text-[11px]">${p.barcode || '-'}</td>
        <td class="p-2 text-white font-medium">${p.name}</td>
        <td class="p-2 text-right text-emerald-400 font-bold">$${p.price.toFixed(2)}</td>
        <td class="p-2 text-center font-bold text-white">${p.stock}</td>
      </tr>
    `).join('');
  }

  showToast(`CSV procesado: ${parsedImportProducts.length} productos detectados`, 'info');
}

async function submitImport() {
  if (parsedImportProducts.length === 0) return;

  const modeRadios = document.getElementsByName('import-mode');
  let selectedMode = 'merge';
  for (const r of modeRadios) { if (r.checked) selectedMode = r.value; }

  const btnProcess = document.getElementById('btn-process-import');
  if (btnProcess) { btnProcess.disabled = true; btnProcess.textContent = 'Importando...'; }

  const response = await API.importProductsBatch(parsedImportProducts, selectedMode);

  if (response.success) {
    showToast(response.message, 'success');
    closeImportModal();
    await loadCategories();
    await loadProducts();
    updateAlertBadge();
  } else {
    showToast(response.message || 'Error al importar productos', 'error');
    if (btnProcess) { btnProcess.disabled = false; btnProcess.textContent = 'Confirmar e Importar'; }
  }
}

function downloadCsvTemplate() {
  const headers = ['Codigo_Barras', 'Nombre', 'Descripcion', 'Categoria', 'Precio_Venta', 'Costo', 'Stock', 'Stock_Minimo', 'Unidad'];
  const sampleRows = [
    ['7791234567890', 'Coca Cola 500ml', 'Botella plástica', 'Refrescos', '1500.00', '950.00', '24', '10', 'unidades'],
    ['7799876543210', 'Papas Fritas Lays 140g', 'Bolsa familiar', 'Snacks', '2500.00', '1600.00', '15', '8', 'unidades']
  ];

  const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'plantilla_inventario_kiosco.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportProductsCSV() {
  showToast('Descargando catálogo en CSV...', 'info');
  window.location.href = API.exportProductsCSVUrl();
}

function openImportModal() {
  parsedImportProducts = [];
  const modal = document.getElementById('import-modal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  setupDropZone();
}

function closeImportModal() {
  const modal = document.getElementById('import-modal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  parsedImportProducts = [];
}

function openClearModal() {
  const modal = document.getElementById('clear-modal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeClearModal() {
  const modal = document.getElementById('clear-modal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function submitClearInventory() {
  const input = document.getElementById('clear-confirm-input');
  if (!input || input.value.trim().toUpperCase() !== 'CONFIRMAR') {
    showToast('Escribe CONFIRMAR para ejecutar', 'warning');
    return;
  }

  const typeRadios = document.getElementsByName('clear-action-type');
  let selectedMode = 'reset_stock';
  for (const r of typeRadios) { if (r.checked) selectedMode = r.value; }

  const response = await API.clearInventory(selectedMode);
  if (response.success) {
    showToast(response.message, 'success');
    closeClearModal();
    await loadCategories();
    await loadProducts();
    updateAlertBadge();
  } else {
    showToast(response.message || 'Error al resetear inventario', 'error');
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
