const fs = require('fs');
const path = require('path');
const { env } = require('./config/env');

// Asegurarse de que la carpeta uploads exista
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Carpeta uploads creada en:', uploadsDir);
}

const app = require('./app');

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa no manejada:', reason);
});
console.log('Servidor backend iniciando...');
