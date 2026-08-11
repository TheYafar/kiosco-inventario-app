-- Script de creación de base de datos PostgreSQL para Kiosco App

-- Tabla de Categorías / Grupos
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(20) DEFAULT '#4F46E5',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    unit VARCHAR(20) DEFAULT 'unidades',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de búsquedas y filtros
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Datos Semilla (Seeders) para demostración rápida
INSERT INTO categories (name, description, color_code) VALUES
('Bebidas', 'Gaseosas, aguas, jugos y energizantes', '#3B82F6'),
('Snacks y Salados', 'Papas fritas, galletitas saladas y frutos secos', '#F59E0B'),
('Golosinas y Chocolates', 'Caramelos, alfajores, chocolates y chicles', '#EC4899'),
('Cigarrillos y Tabacos', 'Cigarrillos, tabaco suelto y accesorios', '#6B7280'),
('Almacén y Lácteos', 'Panificados, leches, alfajores y comestibles varios', '#10B981')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (barcode, name, description, category_id, price, cost, stock, min_stock, unit) VALUES
('7791234567890', 'Coca Cola 500ml', 'Botella plástica personal', 1, 1500.00, 950.00, 24, 10, 'unidades'),
('7791234567891', 'Agua Mineral Villavicencio 500ml', 'Sin gas', 1, 1000.00, 580.00, 3, 10, 'unidades'),
('7791234567892', 'Monster Energy 473ml', 'Lata sabor original', 1, 2200.00, 1400.00, 5, 8, 'unidades'),
('7799876543210', 'Papas Fritas Lays Clásicas 140g', 'Bolsa tamaño familiar', 2, 2500.00, 1600.00, 2, 8, 'unidades'),
('7799876543211', 'Doritos Queso 120g', 'Tortillas de maíz', 2, 2400.00, 1500.00, 15, 6, 'unidades'),
('7795555444331', 'Alfajor Havanna Mixto', 'Chocolate negro con dulce de leche', 3, 1200.00, 700.00, 4, 12, 'unidades'),
('7795555444332', 'Chocolate Shot 170g', 'Chocolate con leche y maní', 3, 3100.00, 1950.00, 18, 5, 'unidades'),
('7795555444333', 'Chicles Beldent Menta', 'Cajita 10 tabletas', 3, 600.00, 320.00, 1, 15, 'unidades'),
('7790000111222', 'Marlboro Box 20', 'Cajetilla común', 4, 3800.00, 3200.00, 8, 10, 'unidades'),
('7790000111223', 'Philip Morris Caps 20', 'Cajetilla mentolado', 4, 3600.00, 3050.00, 2, 10, 'unidades')
ON CONFLICT (barcode) DO NOTHING;

-- =============================================================================
-- PARTE 2: GESTIÓN DE CLIENTES, FIADOS Y ABONOS
-- =============================================================================

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Cuentas por Cobrar (Fiados)
CREATE TABLE IF NOT EXISTS fiados (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    monto_inicial NUMERIC(10, 2) NOT NULL,
    monto_actual NUMERIC(10, 2) NOT NULL,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADO', 'VENCIDO')),
    recargo_aplicado BOOLEAN DEFAULT FALSE,
    notas TEXT
);

-- Tabla de Abonos (Pagos Parciales)
CREATE TABLE IF NOT EXISTS abonos (
    id SERIAL PRIMARY KEY,
    fiado_id INTEGER NOT NULL REFERENCES fiados(id) ON DELETE CASCADE,
    monto NUMERIC(10, 2) NOT NULL,
    fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PARTE 3: GESTIÓN DE DEVOLUCIONES Y REEMBOLSOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS devoluciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    banco VARCHAR(80) NOT NULL,
    cedula VARCHAR(50) NOT NULL,
    monto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    motivo TEXT,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PROCESADA', 'CANCELADA')),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_fiados_cliente ON fiados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fiados_estado ON fiados(estado);
CREATE INDEX IF NOT EXISTS idx_abonos_fiado ON abonos(fiado_id);
CREATE INDEX IF NOT EXISTS idx_devoluciones_estado ON devoluciones(estado);
