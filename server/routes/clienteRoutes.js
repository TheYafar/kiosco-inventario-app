const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// Rutas de Clientes
router.get('/', clienteController.getClientes);
router.post('/clear', clienteController.clearClientes);
router.get('/:id', clienteController.getClienteById);
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;
