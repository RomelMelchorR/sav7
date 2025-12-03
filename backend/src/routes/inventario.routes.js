const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventario.controller');

router.get('/', inventarioController.getAllInventario);
router.get('/:id', inventarioController.getInventarioById);
router.post('/', inventarioController.createInventario);
router.put('/:id', inventarioController.updateInventario);
router.delete('/:id', inventarioController.deleteInventario);

// Ruta para generar reporte PDF de inventario
router.get('/report/pdf', inventarioController.generateInventarioPdfReport);

module.exports = router; 