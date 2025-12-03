const pool = require('../config/db');

const TEXT_FIELDS = [
  'nombrearchivo', 'nromemo', 'nmesa', 'obs_estado', 'estado', 'uni_org_id'
];

const Inventario = {
  async getAll(filters = {}) {
    let baseQuery = 'SELECT * FROM inventario';
    let countQuery = 'SELECT COUNT(*) as total FROM inventario';
    const conditions = [];
    const values = [];
    const countValues = [];

    // Separar los parámetros de paginación de los filtros de búsqueda
    const { limit, offset, ...searchFilters } = filters;

    for (const [key, value] of Object.entries(searchFilters)) {
      if (value !== undefined && value !== '') {
        if (TEXT_FIELDS.includes(key)) {
          conditions.push(`${key} LIKE ?`);
          values.push(`%${value}%`);
          countValues.push(`%${value}%`);
        } else {
          conditions.push(`${key} = ?`);
          values.push(value);
          countValues.push(value);
        }
      }
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      baseQuery += whereClause;
      countQuery += whereClause;
    }

    // Añadir LIMIT y OFFSET a la consulta principal si están presentes
    if (limit !== undefined && offset !== undefined) {
      baseQuery += ' LIMIT ? OFFSET ?';
      values.push(parseInt(limit));
      values.push(parseInt(offset));
    }

    // Ejecutar la consulta principal para obtener los inventarios paginados
    const [rows] = await pool.query(baseQuery, values);

    // Ejecutar la consulta para obtener el total de inventarios (sin paginación)
    const [countResult] = await pool.query(countQuery, countValues);
    const total = countResult[0].total;

    // Devolver los inventarios y el total
    return { inventarios: rows, total };
  },
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM inventario WHERE id = ?', [id]);
    return rows[0];
  },
  async create(data) {
    const { nombrearchivo, nromemo, nmesa, f_subida, obs_estado, estado, f_estado, usr_creador_id, uni_org_id, created_by } = data;
    const [result] = await pool.query(
      `INSERT INTO inventario (nombrearchivo, nromemo, nmesa, f_subida, obs_estado, estado, f_estado, usr_creador_id, uni_org_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [nombrearchivo, nromemo, nmesa, f_subida, obs_estado, estado, f_estado, usr_creador_id, uni_org_id, created_by]
    );
    return { id: result.insertId, ...data };
  },
  async update(id, data) {
    const { nombrearchivo, nromemo, nmesa, f_subida, obs_estado, estado, f_estado, usr_creador_id, uni_org_id, updated_by } = data;
    await pool.query(
      `UPDATE inventario SET nombrearchivo=?, nromemo=?, nmesa=?, f_subida=?, obs_estado=?, estado=?, f_estado=?, usr_creador_id=?, uni_org_id=?, updated_by=? WHERE id=?`,
      [nombrearchivo, nromemo, nmesa, f_subida, obs_estado, estado, f_estado, usr_creador_id, uni_org_id, updated_by, id]
    );
    return { id, ...data };
  },
  async remove(id) {
    await pool.query('DELETE FROM inventario WHERE id = ?', [id]);
    return { id };
  },

  async findDuplicate({ nombrearchivo, nromemo }) {
    const query = 'SELECT * FROM inventario WHERE nombrearchivo = ? AND nromemo = ? LIMIT 1';
    const [rows] = await pool.query(query, [nombrearchivo, nromemo]);
    return rows[0] || null;
  }
};

module.exports = Inventario; 