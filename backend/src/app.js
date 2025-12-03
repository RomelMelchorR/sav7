const express = require('express');
const cors = require('cors');
  const routes = require('./routes');
const { env } = require('./config/env');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Timeout ampliado (12h) para operaciones largas (importaciones)
app.use((req, res, next) => {
  const twelveHoursMs = 12 * 60 * 60 * 1000;
  req.setTimeout(twelveHoursMs);
  res.setTimeout(twelveHoursMs);
  next();
});

// Rutas base (se agregarán más adelante)
app.get('/', (req, res) => {
  res.send('API de Gestión de Archivos funcionando');
});

app.use('/api', routes);

module.exports = app; 
