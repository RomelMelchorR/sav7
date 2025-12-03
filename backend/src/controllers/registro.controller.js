const Registro = require('../models/registro.model');

const path = require('path');

const XLSX = require('xlsx');

const PdfPrinter = require('pdfmake');



exports.getAllRegistros = async (req, res) => {

  try {

    const filtros = req.query;

    const registros = await Registro.getAll(filtros);

    res.json(registros);

  } catch (error) {

    res.status(500).json({ error: 'Error al obtener los registros' });

  }

};



exports.getRegistroById = async (req, res) => {

  try {

    const registro = await Registro.getById(req.params.id);

    if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });

    res.json(registro);

  } catch (error) {

    res.status(500).json({ error: 'Error al obtener el registro' });

  }

};



exports.createRegistro = async (req, res) => {
  try {
    const actor = req.user?.nombre_completo || null;
    const payload = {
      ...req.body,
      cod_uni_org_act: req.body.cod_uni_org_act ? String(req.body.cod_uni_org_act).trim() : req.body.cod_uni_org_act,
      cod_uni_org_ant: normalizarCodigoOptional(req.body.cod_uni_org_ant),
      created_by: actor
    };
    const nuevoRegistro = await Registro.create(payload);
    res.status(201).json(nuevoRegistro);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el registro' });
  }
};

exports.updateRegistro = async (req, res) => {
  try {
    const actor = req.user?.nombre_completo || null;
    const payload = {
      ...req.body,
      cod_uni_org_act: req.body.cod_uni_org_act ? String(req.body.cod_uni_org_act).trim() : req.body.cod_uni_org_act,
      cod_uni_org_ant: normalizarCodigoOptional(req.body.cod_uni_org_ant),
      updated_by: actor
    };
    const registroActualizado = await Registro.update(req.params.id, payload);
    res.json(registroActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el registro' });
  }
};


exports.deleteRegistro = async (req, res) => {

  try {

    await Registro.remove(req.params.id);

    res.json({ message: 'Registro eliminado' });

  } catch (error) {

    res.status(500).json({ error: 'Error al eliminar el registro' });

  }

};



// Controlador para generar reporte PDF de registros

exports.generateRegistrosPdfReport = async (req, res) => {

  try {

    const filters = req.query; // Obtener filtros de la query string



    // Obtener todos los registros que coinciden con los filtros (sin paginaciÃƒÂ³n para el reporte)

    const reportFilters = { ...filters };

    delete reportFilters.limit;

    delete reportFilters.offset;



    const data = await Registro.getAll(reportFilters);

    const registros = data.registros || data; // Asegurarse de obtener el array de registros



    if (!registros || registros.length === 0) {

      return res.status(404).json({ error: 'No se encontraron registros para generar el reporte.' });

    }



    // --- LÃƒÂ³gica de generaciÃƒÂ³n del PDF usando pdfmake ---



    const PdfPrinter = require('pdfmake');

    const path = require('path'); // Importar el mÃƒÂ³dulo path



    // Definir la ruta base de las fuentes (asumiendo que la carpeta fonts estÃƒÂ¡ en backend/)

    const fontsDirectory = path.join(__dirname, '..', '..', 'fonts');



    // Definir las definiciones de fuentes apuntando a los archivos .ttf locales con rutas absolutas

    const fontDefinitions = {

      Roboto: {

        normal: path.join(fontsDirectory, 'Roboto-Regular.ttf'),

        bold: path.join(fontsDirectory, 'Roboto-Medium.ttf'),

        italics: path.join(fontsDirectory, 'Roboto-Italic.ttf'),

        bolditalics: path.join(fontsDirectory, 'Roboto-MediumItalic.ttf')

      }

      // Puedes aÃƒÂ±adir otras fuentes aquÃƒÂ­ si las necesitas, apuntando a sus archivos .ttf

    };



    // Crear la instancia de PdfPrinter, pasando las definiciones de fuentes

    const printer = new PdfPrinter(fontDefinitions);



    // Definir la estructura del documento PDF

    const documentDefinition = {

      pageOrientation: 'landscape', // OrientaciÃƒÂ³n horizontal

      pageMargins: [10, 10, 10, 10], // [left, top, right, bottom] - Reducir mÃƒÂ¡rgenes un poco mÃƒÂ¡s

      content: [

        { text: 'Reporte de Registros', style: 'header' },

        { text: 'Resultados de la bÃƒÂºsqueda', margin: [0, 0, 0, 12] },



        // Tabla de datos de registros (ajusta los encabezados y el mapeo segÃƒÂºn los campos de registro)

        {

          table: {

            headerRows: 1,

            // Ajusta los anchos de las columnas: fijo para ID, proporcionales con diferentes pesos para otros campos (solo enteros)

            widths: [

              10,   // ID (fijo)

              30, // Nro Caja

              20, // ID Inventario

              17, // Nro Paquete

              17, // Nro Registro

              12, // Tomo

              14, // R Inicial

              13, // R Final

              11, // Folios

              60, // Tipo Documental

              60, // Nro Documento

              70, // RazÃƒÂ³n Social

              45, // Nro RUC

              20, // Fecha Extrema

              70, // Observaciones

              60, // C X1

              60, // C X2

              60  // C X3

            ],



            body: [

              // Fila de encabezados de la tabla

              [

                { text: 'ID', bold: true },

                { text: 'Nro Caja', bold: true },

                { text: 'ID Inventario', bold: true },

                { text: 'Nro Paquete', bold: true },

                { text: 'Nro Registro', bold: true },

                { text: 'Tomo', bold: true },

                { text: 'R Inicial', bold: true },

                { text: 'R Final', bold: true },

                { text: 'Folios', bold: true },

                { text: 'Tipo Documental', bold: true },

                { text: 'Nro Documento', bold: true },

                { text: 'RazÃƒÂ³n Social', bold: true },

                { text: 'Nro RUC', bold: true },

                { text: 'Fecha Extrema', bold: true },

                { text: 'Observaciones', bold: true },

                { text: 'C X1', bold: true },

                { text: 'C X2', bold: true },

                { text: 'C X3', bold: true }

              ],

              // Filas de datos - mapea los datos de cada registro a una fila de la tabla

              ...registros.map(registro => {

                console.log('Datos del registro:', registro); // Log para inspeccionar los datos

                return [

                String(registro.id || ''),

                String(registro.n_caja || ''),

                String(registro.id_inventario || ''),

                String(registro.n_paquete || ''),

                String(registro.n_registro || ''),

                String(registro.tomo || ''),

                String(registro.r_inicial || ''),

                String(registro.r_final || ''),

                String(registro.folios || ''),

                String(registro.t_documental || ''),

                String(registro.n_documento || ''),

                String(registro.r_social || ''),

                String(registro.n_ruc || ''),

                registro.f_extrema ? new Date(registro.f_extrema).toLocaleDateString() : '',

                String(registro.c_observaciones || ''),

                String(registro.c_x1 || ''),

                String(registro.c_x2 || ''),

                String(registro.c_x3 || '')

                ]

              })

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

        // Puedes aÃƒÂ±adir mÃƒÂ¡s estilos aquÃƒÂ­

      },

      defaultStyle: { // Estilo por defecto para el texto normal

          font: 'Roboto',

          fontSize: 8

      }

    };



    const pdfDoc = printer.createPdfKitDocument(documentDefinition);



    // Configurar las cabeceras de respuesta para la descarga del PDF

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader('Content-Disposition', 'attachment; filename="reporte_registros.pdf"');



    // Enviar el PDF como respuesta

    pdfDoc.pipe(res);

    pdfDoc.end();





  } catch (error) {

    console.error('Error generating registros PDF report:', error);

    res.status(500).json({ error: 'Error al generar el reporte PDF de registros' });

  }

};



// Función utilitaria para convertir fechas flexibles a aaaa-mm-dd
// Acepta yyyy-mm-dd, dd/mm/aaaa o mm/dd/aaaa (detecta mes/día cuando el segundo componente >12)
function convertirFecha(fecha) {
  if (!fecha) return null;
  const f = String(fecha).trim();
  if (!f) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f; // ya está en formato correcto

  const partes = f.split(/[/\-]/);
  if (partes.length !== 3) return null;

  const p0 = parseInt(partes[0], 10);
  const p1 = parseInt(partes[1], 10);
  const p2 = parseInt(partes[2], 10);
  if ([p0, p1, p2].some(Number.isNaN)) return null;

  // Detectar m/d/aaaa si el segundo componente no puede ser mes
  let day = p0;
  let month = p1;
  const year = p2;
  if (p1 > 12 && p0 <= 12) {
    // Interpretar como mm/dd/aaaa
    day = p1;
    month = p0;
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

// Normalizar códigos opcionales: trim y null si viene vacío
function normalizarCodigoOptional(valor) {
  if (valor === undefined || valor === null) return null;
  const t = String(valor).trim();
  return t === '' ? null : t;
}

exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ning?n archivo' });
    }

    console.log('Archivo recibido:', req.file);

    const workbook = XLSX.readFile(req.file.path, {
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('Datos le?dos del Excel:', data.length, 'filas');

    const results = {
      success: [],
      errors: []
    };

    const totalRows = data.length;
    const startTime = Date.now();
    
    for (let i = 0; i < totalRows; i++) {
      const row = data[i];
      const currentRow = i + 1;
      const progress = Math.round((currentRow / totalRows) * 100);
      if (currentRow % 50 === 0 || currentRow === totalRows) {
        console.log(`Procesando fila ${currentRow}/${totalRows} (${progress}%)`);
      }
      try {
        function parseOrNull(val) {
          const num = parseInt(val);
          return (isNaN(num) ? null : num);
        }
        const registroData = {
          n_caja: parseOrNull(row.n_caja),
          id_inventario: parseOrNull(row.id_inventario),
          n_paquete: parseOrNull(row.n_paquete),
          n_registro: parseOrNull(row.n_registro),
          tomo: parseOrNull(row.tomo),
          r_inicial: parseOrNull(row.r_inicial),
          r_final: parseOrNull(row.r_final),
          folios: parseOrNull(row.folios),
          t_documental: String(row.t_documental || ''),
          n_documento: String(row.n_documento || ''),
          r_social: String(row.r_social || ''),
          n_ruc: parseOrNull(row.n_ruc),
          f_extrema: convertirFecha(row.f_extrema),
          created_at: convertirFecha(row.created_at),
          updated_at: convertirFecha(row.updated_at),
          c_observaciones: String(row.c_observaciones || ''),
          c_x1: String(row.c_x1 || ''),
          c_x2: String(row.c_x2 || ''),
          c_x3: String(row.c_x3 || ''),
          cod_uni_org_act: String(row.cod_uni_org_act || '').trim(),
          cod_uni_org_ant: normalizarCodigoOptional(row.cod_uni_org_ant),
          created_by: req.user?.nombre_completo || null,
          _rowData: row
        };

        if (registroData.n_caja === null) {
          throw new Error('N?mero de caja es requerido y debe ser un n?mero v?lido');
        }
        if (!registroData.cod_uni_org_act) {
          throw new Error('C?digo de unidad org?nica actual es requerido');
        }

        const numericFields = ['id_inventario','n_paquete','n_registro','tomo','r_inicial','r_final','folios','n_ruc'];
        for (const field of numericFields) {
          if (row[field] !== undefined && row[field] !== null && row[field] !== '' && registroData[field] === null) {
            throw new Error(`El campo '${field}' debe ser un n?mero v?lido (no NaN)`);
          }
        }

        const searchData = {
          n_caja: registroData.n_caja,
          n_paquete: registroData.n_paquete,
          n_registro: registroData.n_registro,
          tomo: registroData.tomo,
          folios: registroData.folios,
          n_documento: registroData.n_documento,
          n_ruc: registroData.n_ruc,
        };

        const existingDoc = await Registro.findDuplicate(searchData);

        if (existingDoc) {
          results.errors.push({
            type: 'duplicate',
            data: {
              n_caja: registroData.n_caja,
              n_paquete: registroData.n_paquete,
              n_registro: registroData.n_registro,
              tomo: registroData.tomo,
              t_documental: registroData.t_documental,
              n_documento: registroData.n_documento,
              n_ruc: registroData.n_ruc,
              row: registroData._rowData
            },
            message: 'Registro duplicado encontrado'
          });
          continue;
        }

        delete registroData._rowData;
        const nuevoRegistro = await Registro.create(registroData);
        results.success.push(nuevoRegistro);
        
      } catch (error) {
        console.error('Error procesando fila:', row, error);
        results.errors.push({
          row: row,
          error: error.message
        });
      }
      if (currentRow % 100 === 0 && global.gc) {
        global.gc();
      }
    }

    require('fs').unlinkSync(req.file.path);

    let errorExcelPath = null;
    if (results.errors.length > 0) {
      errorExcelPath = await generateErrorExcel(results.errors, req.file.originalname);
    }

    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);

    res.json({
      message: `Importaci?n completada: ${results.success.length} registros importados, ${results.errors.length} errores`,
      results: results,
      errorExcelPath: errorExcelPath,
      totalTime: totalTime,
      totalRows: totalRows
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

// Funci// FunciÃƒÂ³n para generar Excel con registros que tuvieron errores

async function generateErrorExcel(errors, originalFileName) {

  try {

    const errorData = errors.map((error, index) => {

      const row = error.row || error.data?.row || {};

      // Detectar columnas con error si el mensaje lo indica

      let columnasConError = '';

      if (error.message && error.message.includes("debe ser un nÃƒÂºmero vÃƒÂ¡lido")) {

        // Buscar el nombre del campo en el mensaje

        const regex = /El campo '([^']+)' debe ser un nÃƒÂºmero vÃƒÂ¡lido/;

        const match = error.message.match(regex);

        if (match && match[1]) {

          columnasConError = match[1];

        }

      }

      // Si el error es por duplicado, no hay columna especÃƒÂ­fica

      return {

        'Fila Original': index + 1,

        'NÃ‚Â° Caja': row.n_caja || error.data?.n_caja || '',

        'ID Inventario': row.id_inventario || '',

        'NÃ‚Â° Paquete': row.n_paquete || error.data?.n_paquete || '',

        'NÃ‚Â° Registro': row.n_registro || error.data?.n_registro || '',

        'Tomo': row.tomo || error.data?.tomo || '',

        'R. Inicial': row.r_inicial || '',

        'R. Final': row.r_final || '',

        'Folios': row.folios || error.data?.folios || '',

        'Tipo Documental': row.t_documental || error.data?.t_documental || '',

        'NÃ‚Â° Documento': row.n_documento || error.data?.n_documento || '',

        'RazÃƒÂ³n Social': row.r_social || '',

        'RUC': row.n_ruc || error.data?.n_ruc || '',

        'Fecha Extrema': row.f_extrema || '',

        'Observaciones': row.c_observaciones || '',

        'X1': row.c_x1 || '',

        'X2': row.c_x2 || '',

        'X3': row.c_x3 || '',

        'Cod. Uni. Org. Act': row.cod_uni_org_act || '',

        'Cod. Uni. Org. Ant': row.cod_uni_org_ant || '',

        'Columnas con error': columnasConError,

        'Tipo de Error': error.type || 'validaciÃƒÂ³n',

        'Mensaje de Error': error.message || error.error || 'Error desconocido'

      };

    });



    // Crear workbook y worksheet

    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet(errorData);



    // Ajustar anchos de columna

    const columnWidths = [

      { wch: 12 }, // Fila Original

      { wch: 10 }, // NÃ‚Â° Caja

      { wch: 12 }, // ID Inventario

      { wch: 12 }, // NÃ‚Â° Paquete

      { wch: 12 }, // NÃ‚Â° Registro

      { wch: 8 },  // Tomo

      { wch: 10 }, // R. Inicial

      { wch: 10 }, // R. Final

      { wch: 8 },  // Folios

      { wch: 20 }, // Tipo Documental

      { wch: 15 }, // NÃ‚Â° Documento

      { wch: 30 }, // RazÃƒÂ³n Social

      { wch: 12 }, // RUC

      { wch: 12 }, // Fecha Extrema

      { wch: 25 }, // Observaciones

      { wch: 15 }, // X1

      { wch: 15 }, // X2

      { wch: 15 }, // X3

      { wch: 20 }, // Cod. Uni. Org. Act

      { wch: 20 }, // Cod. Uni. Org. Ant

      { wch: 15 }, // Tipo de Error

      { wch: 40 }  // Mensaje de Error

    ];

    worksheet['!cols'] = columnWidths;



    // Agregar worksheet al workbook

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros con Errores');



    // Generar nombre de archivo

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const baseFileName = originalFileName.replace(/\.(xlsx|xls)$/i, '');

    const errorFileName = `${baseFileName}_errores_${timestamp}.xlsx`;



    // Guardar archivo

    const fs = require('fs');

    const path = require('path');

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

    const errorFilePath = path.join(uploadsDir, errorFileName);



    XLSX.writeFile(workbook, errorFilePath);



    console.log('Archivo de errores generado:', errorFilePath);

    return errorFileName; // Retornar solo el nombre del archivo



  } catch (error) {

    console.error('Error generando archivo de errores:', error);

    return null;

  }

}



// Controlador para descargar archivo de errores

exports.downloadErrorFile = async (req, res) => {

  try {

    const { filename } = req.params;

    

    if (!filename) {

      return res.status(400).json({ error: 'Nombre de archivo requerido' });

    }



    const path = require('path');

    const fs = require('fs');

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

    const filePath = path.join(uploadsDir, filename);



    // Verificar que el archivo existe

    if (!fs.existsSync(filePath)) {

      return res.status(404).json({ error: 'Archivo no encontrado' });

    }



    // Verificar que es un archivo de errores (por seguridad)

    if (!filename.includes('_errores_')) {

      return res.status(403).json({ error: 'Acceso denegado' });

    }



    // Configurar headers para descarga

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.setHeader('Content-Length', fs.statSync(filePath).size);



    // Enviar archivo

    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);



    // Limpiar archivo despuÃƒÂ©s de la descarga (opcional)

    fileStream.on('end', () => {

      // Comentar la siguiente lÃƒÂ­nea si quieres mantener los archivos

      // fs.unlinkSync(filePath);

    });



  } catch (error) {

    console.error('Error descargando archivo de errores:', error);

    res.status(500).json({ error: 'Error al descargar el archivo' });

  }

};








