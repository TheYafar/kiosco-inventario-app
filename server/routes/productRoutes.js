const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Rutas de Productos
router.get('/', productController.getProducts);
router.get('/alerts', productController.getLowStockAlerts);
router.get('/alertas', productController.getLowStockAlerts);
router.get('/metrics', productController.getMetrics);
router.get('/export/csv', productController.exportProductsCSV);
router.post('/clear', productController.clearInventory);
router.post('/import/csv', productController.importProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/stock', productController.updateStock);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
