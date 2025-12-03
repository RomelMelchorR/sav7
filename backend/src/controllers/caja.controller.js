const Caja = require('../models/caja.model');
const path = require('path');
const XLSX = require('xlsx');

exports.getAllCajas = async (req, res) => {
  try {
    const filtros = req.query;
    const cajas = await Caja.getAll(filtros);
    res.json(cajas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las cajas' });
  }
};

exports.getCajaById = async (req, res) => {
  try {
    const caja = await Caja.getById(req.params.id);
    if (!caja) return res.status(404).json({ error: 'Caja no encontrada' });
    res.json(caja);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la caja' });
  }
};

exports.createCaja = async (req, res) => {
  try {
    const actor = req.user?.nombre_completo || null;
    const nuevaCaja = await Caja.create({ ...req.body, created_by: actor });
    res.status(201).json(nuevaCaja);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la caja' });
  }
};

exports.updateCaja = async (req, res) => {
  try {
    const actor = req.user?.nombre_completo || null;
    const cajaActualizada = await Caja.update(req.params.id, { ...req.body, updated_by: actor });
    res.json(cajaActualizada);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la caja' });
  }
};

exports.deleteCaja = async (req, res) => {
  try {
    await Caja.remove(req.params.id);
    res.json({ message: 'Caja eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la caja' });
  }
};

// Controlador para generar reporte PDF de cajas
exports.generateCajasPdfReport = async (req, res) => {
  try {
    const filters = req.query; // Obtener filtros de la query string

    // Obtener todas las cajas que coinciden con los filtros (sin paginación para el reporte)
    // NOTA: La función Caja.getAll actualmente usa paginación por defecto. 
    // Podríamos necesitar ajustar el modelo o crear una nueva función getAllFiltered para reportes.
    // Por ahora, pasaremos limit y offset como undefined en los filters para intentar obtener todos los resultados.
    const reportFilters = { ...filters };
    delete reportFilters.limit;
    delete reportFilters.offset;

    const data = await Caja.getAll(reportFilters); // Llama a getAll sin paginación
    const cajas = data.cajas || data; // Asegurarse de obtener el array de cajas

    if (!cajas || cajas.length === 0) {
      return res.status(404).json({ error: 'No se encontraron cajas para generar el reporte.' });
    }

    // --- Lógica de generación del PDF usando pdfmake ---

    const PdfPrinter = require('pdfmake');
    // No necesitamos importar vfs_fonts.js para ejecución en servidor con archivos de fuentes reales
    // const vfs = require('pdfmake/build/vfs_fonts.js');

    // Definir la ruta base de las fuentes
    // __dirname es la ruta al directorio actual (backend/src/controllers)
    // Usamos path.join para ir dos niveles arriba (a backend/) y luego entrar a la carpeta fonts
    const fontsDirectory = path.join(__dirname, '..', '..', 'fonts');

    // Definir las definiciones de fuentes apuntando a los archivos .ttf locales con rutas absolutas
    const fontDefinitions = {
      Roboto: {
        normal: path.join(fontsDirectory, 'Roboto-Regular.ttf'),
        bold: path.join(fontsDirectory, 'Roboto-Medium.ttf'),
        italics: path.join(fontsDirectory, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDirectory, 'Roboto-MediumItalic.ttf')
      }
      // Puedes añadir otras fuentes aquí si las necesitas, apuntando a sus archivos .ttf
    };

    // Crear la instancia de PdfPrinter, pasando las definiciones de fuentes
    // No pasamos el objeto vfs aquí, ya que usamos archivos de fuentes reales
    const printer = new PdfPrinter(fontDefinitions);

    // Definir la estructura del documento PDF
    const documentDefinition = {
      pageOrientation: 'landscape',
      pageMargins: [20, 20, 20, 20],
      content: [
        { text: 'Reporte de Cajas', style: 'header' },
        { text: 'Resultados de la búsqueda', margin: [0, 0, 0, 12] },

        // Tabla de datos de cajas
        {
          table: {
            headerRows: 1,
            // Ajusta los anchos de las columnas según los datos que esperas
            widths: ['auto', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*' ], 

            body: [
              // Fila de encabezados de la tabla (ajusta los nombres de los campos)
              [
                { text: 'ID', bold: true }, 
                { text: 'Anaquel', bold: true },
                { text: 'Cuerpo', bold: true },
                { text: 'Nivel', bold: true },
                { text: 'Fila', bold: true },
                { text: 'Posición', bold: true },
                { text: 'Fecha Creación', bold: true },
                { text: 'Ubicación Z', bold: true },
                { text: 'Locación', bold: true },
                { text: 'Creado At', bold: true },
                { text: 'Actualizado At', bold: true },
                { text: 'Creado Por', bold: true },
                { text: 'Actualizado Por', bold: true },
              ],
              // Filas de datos - mapea los datos de cada caja a una fila de la tabla
              ...cajas.map(caja => [ 
                caja.id, 
                caja.anaquel,
                caja.cuerpo,
                caja.nivel,
                caja.fila,
                caja.posicion,
                caja.f_creacion ? new Date(caja.f_creacion).toLocaleDateString() : '', // Formato de fecha
                caja.z_ubicacion,
                caja.locacion,
                caja.created_at ? new Date(caja.created_at).toLocaleString() : '', // Formato de fecha y hora
                caja.updated_at ? new Date(caja.updated_at).toLocaleString() : '', // Formato de fecha y hora
                caja.created_by,
                caja.updated_by,
              ])
            ]
          }
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 18] 
        },
        // Puedes añadir más estilos aquí
      },
      defaultStyle: { // Estilo por defecto para el texto normal
          font: 'Roboto',
          fontSize: 8
      }
    };

    const pdfDoc = printer.createPdfKitDocument(documentDefinition);

    // Configurar las cabeceras de respuesta para la descarga del PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=\"reporte_cajas.pdf\"');

    // Enviar el PDF como respuesta
    pdfDoc.pipe(res);
    pdfDoc.end();


  } catch (error) {
    console.error('Error generating cajas PDF report:', error);
    res.status(500).json({ error: 'Error al generar el reporte PDF de cajas' });
  }
};

// Función utilitaria para convertir dd/mm/aaaa a aaaa-mm-dd
function convertirFecha(fecha) {
  if (!fecha) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha; // ya está en formato correcto
  const partes = fecha.split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
  }
  return null;
}

// Controlador para descargar archivo de errores
exports.downloadErrorFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename) {
      return res.status(400).json({ error: 'Nombre de archivo no proporcionado' });
    }

    const path = require('path');
    const fs = require('fs');
    
    const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Enviar el archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Eliminar el archivo después de enviarlo
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error eliminando archivo temporal:', err);
      });
    });

  } catch (error) {
    console.error('Error downloading error file:', error);
    res.status(500).json({ error: 'Error al descargar el archivo' });
  }
};

exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    console.log('Archivo recibido:', req.file);

    const startTime = Date.now();

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('Datos leídos del Excel:', data.length, 'filas');

    const results = {
      success: [],
      errors: []
    };
    const totalRows = data.length;

    for (let i = 0; i < totalRows; i++) {
      const row = data[i];
      const currentRow = i + 1;
      const progress = Math.round((currentRow / totalRows) * 100);
      
      // Log del progreso cada 50 filas para no saturar la consola
      if (currentRow % 50 === 0 || currentRow === totalRows) {
        console.log(`Procesando fila ${currentRow}/${totalRows} (${progress}%)`);
      }
      try {
        const cajaData = {
          id: parseInt(row.id),
          anaquel: parseInt(row.anaquel),
          cuerpo: parseInt(row.cuerpo),
          nivel: String(row.nivel),
          fila: String(row.fila),
          posicion: parseInt(row.posicion),
          f_creacion: convertirFecha(row.f_creacion),
          z_ubicacion: String(row.z_ubicacion),
          locacion: String(row.locacion),
          created_by: req.user?.nombre_completo || null
        };

        // Validaciones
        if (!cajaData.id || isNaN(cajaData.id)) {
          throw new Error('ID debe ser un número válido');
        }
        if (!cajaData.anaquel || isNaN(cajaData.anaquel)) {
          throw new Error('Anaquel debe ser un número válido');
        }
        if (!cajaData.cuerpo || isNaN(cajaData.cuerpo)) {
          throw new Error('Cuerpo debe ser un número válido');
        }
        if (!cajaData.nivel) {
          throw new Error('Nivel es requerido');
        }
        if (!cajaData.fila) {
          throw new Error('Fila es requerido');
        }
        if (!cajaData.posicion || isNaN(cajaData.posicion)) {
          throw new Error('Posición debe ser un número válido');
        }
        if (!cajaData.f_creacion) {
          throw new Error('Fecha de creación es requerida');
        }
        if (!cajaData.z_ubicacion) {
          throw new Error('Ubicación Z es requerida');
        }
        if (!cajaData.locacion) {
          throw new Error('Locación es requerida');
        }

        console.log('Intentando crear caja con datos:', cajaData);
        const nuevaCaja = await Caja.create(cajaData);
        results.success.push(nuevaCaja);
      } catch (error) {
        console.error('Error procesando fila:', row, error);
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }

    // Eliminar el archivo después de procesarlo
    require('fs').unlinkSync(req.file.path);

    // Si hay errores, generar archivo Excel con los registros fallidos
    let errorExcelPath = null;
    if (results.errors.length > 0) {
      errorExcelPath = await generateErrorExcel(results.errors, req.file.originalname);
    }

    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);

    res.json({
      message: `Importación completada: ${results.success.length} cajas importadas, ${results.errors.length} errores`,
      results: results,
      errorExcelPath: errorExcelPath,
      totalTime: totalTime,
      totalRows: data.length
    });
  } catch (error) {
    console.error('Error completo en importExcel:', error);
    if (req.file) {
      try {
        require('fs').unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error eliminando archivo temporal:', err);
      }
    }
    res.status(500).json({ 
      error: 'Error al procesar el archivo Excel: ' + error.message,
      details: error.stack 
    });
  }
};

// Función para generar Excel con registros que tuvieron errores
async function generateErrorExcel(errors, originalFileName) {
  try {
    const errorData = errors.map((error, index) => {
      const row = error.row || {};
      
      // Detectar columnas con error si el mensaje lo indica
      let columnasConError = '';
      if (error.message && error.message.includes("debe ser un número válido")) {
        const regex = /([^']+) debe ser un número válido/;
        const match = error.message.match(regex);
        if (match && match[1]) {
          columnasConError = match[1];
        }
      }

      return {
        'Fila Original': index + 1,
        'ID': row.id || '',
        'Anaquel': row.anaquel || '',
        'Cuerpo': row.cuerpo || '',
        'Nivel': row.nivel || '',
        'Fila': row.fila || '',
        'Posición': row.posicion || '',
        'Fecha Creación': row.f_creacion || '',
        'Ubicación Z': row.z_ubicacion || '',
        'Locación': row.locacion || '',
        'Columnas con error': columnasConError,
        'Tipo de Error': 'validación',
        'Mensaje de Error': error.message || 'Error desconocido'
      };
    });

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(errorData);

    // Ajustar anchos de columna
    const columnWidths = [
      { wch: 12 }, // Fila Original
      { wch: 10 }, // ID
      { wch: 10 }, // Anaquel
      { wch: 10 }, // Cuerpo
      { wch: 10 }, // Nivel
      { wch: 10 }, // Fila
      { wch: 10 }, // Posición
      { wch: 15 }, // Fecha Creación
      { wch: 15 }, // Ubicación Z
      { wch: 15 }, // Locación
      { wch: 20 }, // Columnas con error
      { wch: 15 }, // Tipo de Error
      { wch: 40 }  // Mensaje de Error
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cajas con Errores');

    // Generar nombre de archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseFileName = originalFileName.replace(/\.(xlsx|xls)$/i, '');
    const errorFileName = `${baseFileName}_errores_${timestamp}.xlsx`;

    // Guardar archivo
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const errorFilePath = path.join(uploadsDir, errorFileName);

    XLSX.writeFile(workbook, errorFilePath);

    console.log('Archivo de errores generado:', errorFilePath);
    return errorFileName;

  } catch (error) {
    console.error('Error generando archivo de errores:', error);
    return null;
  }
};
