const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/caja.controller');
const upload = require('../middlewares/upload');

router.get('/', cajaController.getAllCajas);
router.get('/:id', cajaController.getCajaById);
router.post('/', cajaController.createCaja);
router.put('/:id', cajaController.updateCaja);
router.delete('/:id', cajaController.deleteCaja);

// Nueva ruta para generar reporte PDF de cajas
router.get('/report/pdf', cajaController.generateCajasPdfReport);

// Ruta para importar cajas desde Excel
router.post('/import/excel', upload.single('file'), cajaController.importExcel);

// Ruta para descargar archivo de errores
// Nota: Esta ruta se manejará a través del controlador dedicado de descargas
// La ruta base /download está configurada en routes/index.js

module.exports = router;