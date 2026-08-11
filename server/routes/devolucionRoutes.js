const express = require('express');
const router = express.Router();
const devolucionController = require('../controllers/devolucionController');

router.get('/', devolucionController.getDevoluciones);
router.post('/', devolucionController.createDevolucion);
router.patch('/:id/estado', devolucionController.updateEstado);
router.delete('/:id', devolucionController.deleteDevolucion);

module.exports = router;
