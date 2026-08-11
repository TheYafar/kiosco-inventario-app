const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const fiadoRoutes = require('./routes/fiadoRoutes');
const devolucionRoutes = require('./routes/devolucionRoutes');
const moraService = require('./services/moraService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del Frontend
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de API REST
app.use('/api/productos', productRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categorias', categoryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/fiados', fiadoRoutes);
app.use('/api/devoluciones', devolucionRoutes);

// Ruta de Salud de la API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Kiosco App API',
    timestamp: new Date()
  });
});

// Redirección por defecto a index.html para rutas HTML no encontradas
app.get('*', (req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

// Manejo Global de Errores
app.use((err, req, res, next) => {
  console.error('❌ Error no controlado en la API:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Servidor Kiosco App ejecutándose en: http://localhost:${PORT}`);
  console.log(`📦 Inventario: http://localhost:${PORT}/inventario.html`);
  console.log(`💳 Cuentas Fiadas: http://localhost:${PORT}/fiados.html`);
  console.log(`🔄 Devoluciones: http://localhost:${PORT}/devoluciones.html`);
  console.log(`🚨 Alertas: http://localhost:${PORT}/alertas.html`);
  console.log(`==================================================`);

  // Iniciar tarea programada para la evaluación automática de mora (+5%)
  moraService.iniciarTareaProgramada();
});
