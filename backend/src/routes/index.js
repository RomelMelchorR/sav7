const express = require('express');
const router = express.Router();
const cajaRoutes = require('./caja.routes');
const registroRoutes = require('./registro.routes');
const inventarioRoutes = require('./inventario.routes');
const authRoutes = require('./auth.routes');
const downloadRoutes = require('./download.routes');
const { requireAuth } = require('../middlewares/auth');

// Aquí se importarán y montarán las rutas de cada módulo (usuarios, archivos, cajas, etc.)

// Rutas públicas
router.use('/auth', authRoutes);

// Rutas protegidas con JWT
router.use('/cajas', requireAuth, cajaRoutes);
router.use('/registros', requireAuth, registroRoutes);
router.use('/inventario', requireAuth, inventarioRoutes);
router.use('/download', requireAuth, downloadRoutes);

module.exports = router;
