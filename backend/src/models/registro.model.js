const pool = require('../config/db');

const TEXT_FIELDS = [
  't_documental', 'n_documento', 'r_social', 'c_observaciones',
  'c_x1', 'c_x2', 'c_x3', 'cod_uni_org_act', 'cod_uni_org_ant'
];

const Registro = {
  async getAll(filters = {}) {
    let baseQuery = 'SELECT * FROM ad_inventario_reg';
    let countQuery = 'SELECT COUNT(*) as total FROM ad_inventario_reg';
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

    // Ejecutar la consulta principal para obtener los registros paginados
    const [rows] = await pool.query(baseQuery, values);

    // Ejecutar la consulta para obtener el total de registros (sin paginación)
    const [countResult] = await pool.query(countQuery, countValues);
    const total = countResult[0].total;

    // Devolver los registros y el total
    return { registros: rows, total };
  },
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM ad_inventario_reg WHERE id = ?', [id]);
    return rows[0];
  },
  async create(data) {
    const { n_caja, id_inventario, n_paquete, n_registro, tomo, r_inicial, r_final, folios, t_documental, n_documento, r_social, n_ruc, f_extrema, c_observaciones, c_x1, c_x2, c_x3, cod_uni_org_act, cod_uni_org_ant, created_by } = data;
    const [result] = await pool.query(
      `INSERT INTO ad_inventario_reg (n_caja, id_inventario, n_paquete, n_registro, tomo, r_inicial, r_final, folios, t_documental, n_documento, r_social, n_ruc, f_extrema, c_observaciones, c_x1, c_x2, c_x3, cod_uni_org_act, cod_uni_org_ant, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [n_caja, id_inventario, n_paquete, n_registro, tomo, r_inicial, r_final, folios, t_documental, n_documento, r_social, n_ruc, f_extrema, c_observaciones, c_x1, c_x2, c_x3, cod_uni_org_act, cod_uni_org_ant, created_by]
    );
    return { id: result.insertId, ...data };
  },
  async update(id, data) {
    const { n_caja, id_inventario, n_paquete, n_registro, tomo, r_inicial, r_final, folios, t_documental, n_documento, r_social, n_ruc, f_extrema, c_observaciones, c_x1, c_x2, c_x3, cod_uni_org_act, cod_uni_org_ant, updated_by } = data;
    await pool.query(
      `UPDATE ad_inventario_reg SET n_caja=?, id_inventario=?, n_paquete=?, n_registro=?, tomo=?, r_inicial=?, r_final=?, folios=?, t_documental=?, n_documento=?, r_social=?, n_ruc=?, f_extrema=?, c_observaciones=?, c_x1=?, c_x2=?, c_x3=?, cod_uni_org_act=?, cod_uni_org_ant=?, updated_by=? WHERE id=?`,
      [n_caja, id_inventario, n_paquete, n_registro, tomo, r_inicial, r_final, folios, t_documental, n_documento, r_social, n_ruc, f_extrema, c_observaciones, c_x1, c_x2, c_x3, cod_uni_org_act, cod_uni_org_ant, updated_by, id]
    );
    return { id, ...data };
  },
  async remove(id) {
    await pool.query('DELETE FROM ad_inventario_reg WHERE id = ?', [id]);
    return { id };
  },

  async findDuplicate(data) {
    const fields = [
      'n_caja',
      'n_paquete',
      'n_registro',
      'tomo',
      'folios',
      'n_documento',
      'n_ruc',
      'f_extrema'
    ];

    const conditions = [];
    const values = [];

    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        if (field === 'f_extrema') {
          conditions.push(`(${field} = ? OR (${field} IS NULL AND ? IS NULL))`);
        } else {
          conditions.push(`(${field} = ? OR (${field} IS NULL AND ? IS NULL))`);
        }
        values.push(data[field], data[field]);
      }
    }

    if (conditions.length === 0) return null;

    const query = `
      SELECT * FROM ad_inventario_reg 
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `;

    console.log('Búsqueda de duplicados - Query:', query);
    console.log('Búsqueda de duplicados - Valores:', values);

    const [rows] = await pool.query(query, values);
    return rows[0] || null;
  }
};

module.exports = Registro; 