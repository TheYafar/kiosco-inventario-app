const express = require('express');
const router = express.Router();
const fiadoController = require('../controllers/fiadoController');

// Rutas de Cuentas Fiadas y Abonos
router.get('/', fiadoController.getFiados);
router.post('/procesar-mora', fiadoController.procesarMoraManual);
router.get('/:id', fiadoController.getFiadoById);
router.post('/', fiadoController.createFiado);
router.post('/:id/abonar', fiadoController.abonarFiado);

module.exports = router;
