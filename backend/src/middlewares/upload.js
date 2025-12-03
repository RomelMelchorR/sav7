const multer = require('multer');
const path = require('path');

// Configurar el almacenamiento de archivos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Modificar para usar la carpeta uploads en la raíz del proyecto
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function(req, file, cb) {
    // Generar un nombre único para el archivo
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Filtro para aceptar solo archivos Excel
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.mimetype === 'application/vnd.ms-excel') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos Excel (.xlsx o .xls)'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // Límite de 100MB
  }
});

module.exports = upload;
