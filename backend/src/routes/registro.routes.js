const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registro.controller');
const downloadController = require('../controllers/download.controller');
const upload = require('../middlewares/upload');

// Rutas CRUD básicas
router.get('/', registroController.getAllRegistros);
router.get('/:id', registroController.getRegistroById);
router.post('/', registroController.createRegistro);
router.put('/:id', registroController.updateRegistro);
router.delete('/:id', registroController.deleteRegistro);

// Ruta para generar el reporte PDF de registros
router.get('/report/pdf', registroController.generateRegistrosPdfReport);

// Ruta para importar registros desde Excel
router.post('/import/excel', upload.single('file'), registroController.importExcel);

// Ruta para descargar archivo de errores (delegado al controlador unificado)
router.get('/download/errors/:filename', downloadController.downloadFile);

module.exports = router;
