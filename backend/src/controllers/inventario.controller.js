const Inventario = require('../models/inventario.model');
const PdfPrinter = require('pdfmake'); // Necesario para generar PDFs
const path = require('path'); // Necesario para manejar rutas de fuentes

exports.getAllInventario = async (req, res) => {
  try {
    const filtros = req.query;
    const inventario = await Inventario.getAll(filtros);
    res.json(inventario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los items de inventario' });
  }
};

exports.getInventarioById = async (req, res) => {
  try {
    const item = await Inventario.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item de inventario no encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el item de inventario' });
  }
};

exports.createInventario = async (req, res) => {
  try {
    const actor = req.user?.nombre_completo || null;

    // Verificar si ya existe un registro con el mismo nombrearchivo o nromemo
    const existingItem = await Inventario.findDuplicate({
      nombrearchivo: req.body.nombrearchivo,
      nromemo: req.body.nromemo
    });

    if (existingItem) {
      return res.status(400).json({ 
        error: 'Registro duplicado encontrado', 
        details: `Ya existe un registro con el mismo nombre de archivo "${existingItem.nombrearchivo}" y número de memo "${existingItem.nromemo}"`,
        duplicateData: {
          id: existingItem.id,
          nombrearchivo: existingItem.nombrearchivo,
          nromemo: existingItem.nromemo
        }
      });
    }

    const nuevoItem = await Inventario.create({ ...req.body, created_by: actor });
    res.status(201).json(nuevoItem);
  } catch (error) {
    console.error('Error al crear el item de inventario:', error);
    res.status(500).json({ error: 'Error al crear el item de inventario' });
  }
};

exports.updateInventario = async (req, res) => {
  try {
    const actor = req.user?.nombre_completo || null;
    const itemActualizado = await Inventario.update(req.params.id, { ...req.body, updated_by: actor });
    res.json(itemActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el item de inventario' });
  }
};

exports.deleteInventario = async (req, res) => {
  try {
    await Inventario.remove(req.params.id);
    res.json({ message: 'Item de inventario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el item de inventario' });
  }
};

// Controlador para generar reporte PDF de inventario
exports.generateInventarioPdfReport = async (req, res) => {
  try {
    const filters = req.query; // Obtener filtros de la query string

    // Obtener todos los registros de inventario que coinciden con los filtros (sin paginación para el reporte)
    const reportFilters = { ...filters };
    delete reportFilters.limit;
    delete reportFilters.offset;

    const data = await Inventario.getAll(reportFilters);
    const inventarios = data.inventarios || data; // Asegurarse de obtener el array de inventarios

    if (!inventarios || inventarios.length === 0) {
      return res.status(404).json({ error: 'No se encontraron items de inventario para generar el reporte.' });
    }

    // --- Lógica de generación del PDF usando pdfmake ---

    // Definir la ruta base de las fuentes (asumiendo que la carpeta fonts está en backend/)
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
    const printer = new PdfPrinter(fontDefinitions);

    // Definir la estructura del documento PDF
    const documentDefinition = {
      pageOrientation: 'landscape', // Orientación horizontal
      pageMargins: [10, 10, 10, 10], // [left, top, right, bottom]
      content: [
        { text: 'Reporte de Inventario', style: 'header' },
        { text: 'Resultados de la búsqueda', margin: [0, 0, 0, 12] },

        // Tabla de datos de inventario (ajusta los encabezados y el mapeo según los campos de inventario)
        {
          table: {
            headerRows: 1,
            // Definir anchos de columnas basados en los campos del inventario
            widths: [
              20, // id
              70, // nombrearchivo
              60, // nromemo
              44, // nmesa
              55, // f_subida
              67, // obs_estado
              50, // estado
              55, // f_estado
              48, // usr_creador_id
              47, // uni_org_id
              45, // created_by
              50  // updated_by
            ],

            body: [
              // Fila de encabezados de la tabla
              [
                { text: 'ID', bold: true },
                { text: 'Nombre Archivo', bold: true },
                { text: 'Nro Memo', bold: true },
                { text: 'Nro Mesa', bold: true },
                { text: 'Fecha Subida', bold: true },
                { text: 'Observaciones Estado', bold: true },
                { text: 'Estado', bold: true },
                { text: 'Fecha Estado', bold: true },
                { text: 'Usr Creador ID', bold: true },
                { text: 'Uni Org ID', bold: true },
                { text: 'Creado Por', bold: true },
                { text: 'Actualizado Por', bold: true },
              ],
              // Filas de datos - mapea los datos de cada item de inventario a una fila de la tabla
              ...inventarios.map(item => [
                { text: String(item.id || ''), style: 'cuerpoTabla' },
                { text: String(item.nombrearchivo || ''), style: 'cuerpoTabla' },
                { text: String(item.nromemo || ''), style: 'cuerpoTabla' },
                { text: String(item.nmesa || ''), style: 'cuerpoTabla' },
                { text: item.f_subida ? new Date(item.f_subida).toLocaleDateString() : '', style: 'cuerpoTabla' },
                { text: String(item.obs_estado || ''), style: 'cuerpoTabla' },
                { text: String(item.estado || ''), style: 'cuerpoTabla' },
                { text: item.f_estado ? new Date(item.f_estado).toLocaleDateString() : '', style: 'cuerpoTabla' },
                { text: String(item.usr_creador_id || ''), style: 'cuerpoTabla' },
                { text: String(item.uni_org_id || ''), style: 'cuerpoTabla' },
                { text: String(item.created_by || ''), style: 'cuerpoTabla' },
                { text: String(item.updated_by || ''), style: 'cuerpoTabla' },
              ])
            ]
          },
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 18]
        },
        cuerpoTabla: {
          fontSize: 8
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 8
        }
      }
    };

    const pdfDoc = printer.createPdfKitDocument(documentDefinition);

    // Configurar las cabeceras de respuesta para la descarga del PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_inventario.pdf"');

    // Enviar el PDF como respuesta
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error('Error generating inventario PDF report:', error);
    res.status(500).json({ error: 'Error al generar el reporte PDF de inventario' });
  }
};
