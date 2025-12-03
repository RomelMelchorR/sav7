const pool = require('../config/db');

// Definimos los campos que podrían usarse para filtrar (ajusta según necesidad)
// Añadimos created_at, updated_at, created_by, updated_by si no están ya
const ALLOWED_FILTERS = [
  'id', 'anaquel', 'cuerpo', 'nivel', 'fila', 'posicion', 
  'f_creacion', 'z_ubicacion', 'locacion', 'created_at', 'updated_at', 'created_by', 'updated_by'
];

// Campos de texto que usarán LIKE para búsqueda parcial
const TEXT_SEARCH_FIELDS = ['nivel', 'fila', 'z_ubicacion', 'locacion'];

const Caja = {
  async getAll(filters = {}) {
    let baseQuery = 'SELECT * FROM reg_caja';
    const conditions = [];
    const values = [];
    const countValues = []; // Valores separados para la consulta de conteo

    // Extraer limit y offset de los filtros recibidos, usando valores por defecto si no están presentes
    const limit = filters.limit ? parseInt(filters.limit) : 100; // Valor por defecto 100 si no se especifica
    const offset = filters.offset ? parseInt(filters.offset) : 0; // Valor por defecto 0 si no se especifica

    // Clonar filters para eliminar limit y offset antes de procesar los filtros de búsqueda
    const searchFilters = { ...filters };
    delete searchFilters.limit;
    delete searchFilters.offset;

    // Construir el WHERE clause basado en los filtros permitidos
    for (const [key, value] of Object.entries(searchFilters)) {
      // Solo agregar el filtro si el campo está permitido y tiene un valor
      if (ALLOWED_FILTERS.includes(key) && value !== undefined && value !== '') {
        // Si es un campo de texto, usar LIKE con comodines; para id permitir coincidencia parcial
        if (key === 'id') {
          conditions.push('CAST(id AS CHAR) LIKE ?');
          values.push(`%${value}%`);
          countValues.push(`%${value}%`);
        } else if (key === 'f_creacion') {
          // Permitir buscar por año (YYYY), año-mes (YYYY-MM) o fecha completa
          const trimmed = String(value).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            conditions.push(`${key} = ?`);
            values.push(trimmed);
            countValues.push(trimmed);
          } else if (/^\d{4}-\d{2}$/.test(trimmed)) {
            conditions.push(`DATE_FORMAT(${key}, '%Y-%m') LIKE ?`);
            values.push(`${trimmed}%`);
            countValues.push(`${trimmed}%`);
          } else if (/^\d{4}$/.test(trimmed)) {
            conditions.push(`DATE_FORMAT(${key}, '%Y') LIKE ?`);
            values.push(`${trimmed}%`);
            countValues.push(`${trimmed}%`);
          } else {
            // fallback: buscar por texto
            conditions.push(`${key} LIKE ?`);
            values.push(`%${trimmed}%`);
            countValues.push(`%${trimmed}%`);
          }
        } else if (TEXT_SEARCH_FIELDS.includes(key)) {
          conditions.push(`${key} LIKE ?`);
          values.push(`%${value}%`);
          countValues.push(`%${value}%`); // Añadir también a los valores de conteo
        } else {
          // Para campos numéricos, fechas o exactos
          conditions.push(`${key} = ?`);
          values.push(value);
          countValues.push(value); // Añadir también a los valores de conteo
        }
      }
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Consulta para obtener el total de resultados (sin paginación)
    const countQuery = baseQuery.replace('SELECT * FROM', 'SELECT COUNT(*) AS total FROM');
    const [countRows] = await pool.query(countQuery, countValues);
    const total = countRows[0].total;

    // Añadir paginación a la consulta principal
    baseQuery += ' LIMIT ? OFFSET ?';
    values.push(limit, offset);

    // console.log('Received filters:', filters); // Log para ver los filtros recibidos
    // console.log('Executing query:', baseQuery, values); // Log para depuración

    const [rows] = await pool.query(baseQuery, values);
    
    return { // Devolver resultados y total
        cajas: rows,
        total: total
    };
  },
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM reg_caja WHERE id = ?', [id]);
    return rows[0];
  },
  async create(data) {
    const { id, anaquel, cuerpo, nivel, fila, posicion, f_creacion, z_ubicacion, locacion, created_by } = data;
    
    // Asegurar que los valores numéricos sean números o null
    const values = [
      id || null,
      anaquel || null,
      cuerpo || null,
      nivel || null,
      fila || null,
      posicion || null,
      f_creacion || null,
      z_ubicacion || null,
      locacion || null,
      // Si created_by es undefined o no es un número válido, será null
            created_by || null
    ];

    const [result] = await pool.query(
      'INSERT INTO reg_caja (id, anaquel, cuerpo, nivel, fila, posicion, f_creacion, z_ubicacion, locacion, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      values
    );
    
    return { id: result.insertId, ...data };
  },
  async update(id, data) {
    const { anaquel, cuerpo, nivel, fila, posicion, f_creacion, z_ubicacion, locacion, updated_by } = data;
    await pool.query(
      'UPDATE reg_caja SET anaquel=?, cuerpo=?, nivel=?, fila=?, posicion=?, f_creacion=?, z_ubicacion=?, locacion=?, updated_by=? WHERE id=?',
      [anaquel, cuerpo, nivel, fila, posicion, f_creacion, z_ubicacion, locacion, updated_by, id]
    );
    return { id, ...data };
  },
  async remove(id) {
    await pool.query('DELETE FROM reg_caja WHERE id = ?', [id]);
    return { id };
  }
};

module.exports = Caja;
