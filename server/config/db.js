const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    }
  : {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'kiosco_db',
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

let isPgConnected = false;

// Mock in-memory database store if PostgreSQL is unreachable
const memoryDb = {
  categories: [
    { id: 1, name: 'Bebidas', description: 'Gaseosas, aguas, jugos y energizantes', color_code: '#3B82F6', created_at: new Date(), updated_at: new Date() },
    { id: 2, name: 'Snacks y Salados', description: 'Papas fritas, galletitas saladas y frutos secos', color_code: '#F59E0B', created_at: new Date(), updated_at: new Date() },
    { id: 3, name: 'Golosinas y Chocolates', description: 'Caramelos, alfajores, chocolates y chicles', color_code: '#EC4899', created_at: new Date(), updated_at: new Date() },
    { id: 4, name: 'Cigarrillos y Tabacos', description: 'Cigarrillos, tabaco suelto y accesorios', color_code: '#6B7280', created_at: new Date(), updated_at: new Date() },
    { id: 5, name: 'Almacén y Lácteos', description: 'Panificados, leches, alfajores y comestibles varios', color_code: '#10B981', created_at: new Date(), updated_at: new Date() }
  ],
  products: [
    { id: 1, barcode: '7791234567890', name: 'Coca Cola 500ml', description: 'Botella plástica personal', category_id: 1, price: 1500.00, cost: 950.00, stock: 24, min_stock: 10, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 2, barcode: '7791234567891', name: 'Agua Mineral Villavicencio 500ml', description: 'Sin gas', category_id: 1, price: 1000.00, cost: 580.00, stock: 3, min_stock: 10, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 3, barcode: '7791234567892', name: 'Monster Energy 473ml', description: 'Lata sabor original', category_id: 1, price: 2200.00, cost: 1400.00, stock: 5, min_stock: 8, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 4, barcode: '7799876543210', name: 'Papas Fritas Lays Clásicas 140g', description: 'Bolsa tamaño familiar', category_id: 2, price: 2500.00, cost: 1600.00, stock: 2, min_stock: 8, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 5, barcode: '7799876543211', name: 'Doritos Queso 120g', description: 'Tortillas de maíz', category_id: 2, price: 2400.00, cost: 1500.00, stock: 15, min_stock: 6, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 6, barcode: '7795555444331', name: 'Alfajor Havanna Mixto', description: 'Chocolate negro con dulce de leche', category_id: 3, price: 1200.00, cost: 700.00, stock: 4, min_stock: 12, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 7, barcode: '7795555444332', name: 'Chocolate Shot 170g', description: 'Chocolate con leche y maní', category_id: 3, price: 3100.00, cost: 1950.00, stock: 18, min_stock: 5, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 8, barcode: '7795555444333', name: 'Chicles Beldent Menta', description: 'Cajita 10 tabletas', category_id: 3, price: 600.00, cost: 320.00, stock: 1, min_stock: 15, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 9, barcode: '7790000111222', name: 'Marlboro Box 20', description: 'Cajetilla común', category_id: 4, price: 3800.00, cost: 3200.00, stock: 8, min_stock: 10, unit: 'unidades', created_at: new Date(), updated_at: new Date() },
    { id: 10, barcode: '7790000111223', name: 'Philip Morris Caps 20', description: 'Cajetilla mentolado', category_id: 4, price: 3600.00, cost: 3050.00, stock: 2, min_stock: 10, unit: 'unidades', created_at: new Date(), updated_at: new Date() }
  ],
  nextCatId: 6,
  nextProdId: 11,
  clientes: [],
  fiados: [],
  abonos: [],
  devoluciones: [],
  nextClienteId: 1,
  nextFiadoId: 1,
  nextAbonoId: 1,
  nextDevolucionId: 1
};

// Probar conexión a PostgreSQL
async function initDb() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL');
    isPgConnected = true;

    // Crear tablas e insertar datos iniciales si no existen
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await client.query(sql);
      console.log('⚡ Esquema PostgreSQL verificado e inicializado correctamente.');
    }
    client.release();
  } catch (err) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL (' + err.message + '). Usando almacenamiento en memoria de alta velocidad.');
    isPgConnected = false;
  }
}

initDb();

module.exports = {
  pool,
  isPgConnected: () => isPgConnected,
  memoryDb,
  query: async (text, params) => {
    if (isPgConnected) {
      return pool.query(text, params);
    }
    throw new Error('PostgreSQL mode disabled. Using memory database.');
  }
};
