const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

exports.downloadFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename) {
      return res.status(400).json({ error: 'Nombre de archivo no proporcionado' });
    }

    // Normalizar y validar nombre para prevenir path traversal
    const sanitized = path.basename(filename);
    if (sanitized !== filename) {
      return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }

    // Restringir a archivos de errores generados (.xlsx o .xls) con marca
    const ext = path.extname(sanitized).toLowerCase();
    const isExcel = ext === '.xlsx' || ext === '.xls';
    const isErrorReport = sanitized.includes('_errores_');
    if (!isExcel || !isErrorReport) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const filePath = path.join(__dirname, '..', '..', 'uploads', sanitized);
    try {
      await fsPromises.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const stats = await fsPromises.stat(filePath);

    // Configurar headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitized}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');

    // Crear stream de lectura
    const fileStream = fs.createReadStream(filePath);

    fileStream.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al leer el archivo' });
      }
      fileStream.destroy();
    });

    fileStream.on('end', () => {
      // Eliminar el archivo después de enviarlo
      fs.unlink(filePath, () => {});
    });

    res.on('error', () => {
      fileStream.destroy();
    });

    fileStream.pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
};

