/**
 * Módulo API para consumir el Backend REST (kiosco-app)
 */

const API_BASE_URL = '/api';

const API = {
  // --- PRODUCTOS ---
  async getProducts(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE_URL}/products${query ? '?' + query : ''}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return { success: false, message: 'Error de red al obtener productos' };
    }
  },

  async getProductById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener producto por ID:', error);
      return { success: false, message: 'Error de red' };
    }
  },

  async getLowStockAlerts() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/alerts`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener alertas de stock:', error);
      return { success: false, message: 'Error de red al obtener alertas' };
    }
  },

  async getMetrics() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/metrics`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener métricas:', error);
      return { success: false, message: 'Error de red' };
    }
  },

  async createProduct(productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al crear producto:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async updateProduct(id, productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async updateStock(id, stockData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async deleteProduct(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async clearInventory(mode = 'reset_stock') {
    try {
      const response = await fetch(`${API_BASE_URL}/products/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      return await response.json();
    } catch (error) {
      console.error('Error al limpiar inventario:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async importProductsBatch(products, mode = 'merge') {
    try {
      const response = await fetch(`${API_BASE_URL}/products/import/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, mode })
      });
      return await response.json();
    } catch (error) {
      console.error('Error al importar lote de productos:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  exportProductsCSVUrl() {
    return `${API_BASE_URL}/products/export/csv`;
  },

  // --- CATEGORÍAS / GRUPOS ---
  async getCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return { success: false, message: 'Error de red' };
    }
  },

  async createCategory(categoryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al crear categoría:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async updateCategory(id, categoryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async deleteCategory(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  // --- CLIENTES ---
  async getClientes(search = '') {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/clientes${query}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      return { success: false, message: 'Error de conexión al obtener clientes' };
    }
  },

  async getClienteById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/clientes/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener detalle del cliente:', error);
      return { success: false, message: 'Error de red' };
    }
  },

  async createCliente(clienteData) {
    try {
      const response = await fetch(`${API_BASE_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al crear cliente:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  // --- FIADOS / CUENTAS POR COBRAR ---
  async getFiados(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE_URL}/fiados${query ? '?' + query : ''}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener deudas fiadas:', error);
      return { success: false, message: 'Error de conexión al obtener deudas' };
    }
  },

  async createFiado(fiadoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/fiados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fiadoData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al registrar deuda fiada:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async abonarFiado(id, abonoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/fiados/${id}/abonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(abonoData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al abonar a la deuda:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async procesarMora() {
    try {
      const response = await fetch(`${API_BASE_URL}/fiados/procesar-mora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error) {
      console.error('Error al procesar mora:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  // --- DEVOLUCIONES / REEMBOLSOS ---
  async getDevoluciones(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE_URL}/devoluciones${query ? '?' + query : ''}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener devoluciones:', error);
      return { success: false, message: 'Error de conexión al obtener devoluciones' };
    }
  },

  async createDevolucion(devolucionData) {
    try {
      const response = await fetch(`${API_BASE_URL}/devoluciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(devolucionData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error al registrar devolución:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async updateDevolucionEstado(id, estado) {
    try {
      const response = await fetch(`${API_BASE_URL}/devoluciones/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
      return await response.json();
    } catch (error) {
      console.error('Error al actualizar estado de devolución:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  },

  async deleteDevolucion(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/devoluciones/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Error al eliminar devolución:', error);
      return { success: false, message: 'Error de conexión al servidor' };
    }
  }
};

// Toast notification global helper
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-xs pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600 border-emerald-400' :
                  type === 'error' ? 'bg-rose-600 border-rose-400' :
                  type === 'warning' ? 'bg-amber-600 border-amber-400' : 'bg-indigo-600 border-indigo-400';

  const icon = type === 'success' ? '✓' :
               type === 'error' ? '✕' :
               type === 'warning' ? '⚠️' : 'ℹ️';

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl text-white shadow-2xl border ${bgColor} transform transition-all duration-300 translate-y-5 opacity-0 text-xs font-bold`;
  toast.innerHTML = `
    <span class="text-sm">${icon}</span>
    <span class="flex-1">${message}</span>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-5', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
