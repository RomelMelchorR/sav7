// Modelo para reg_usuarios
const pool = require('../config/db');

const Usuario = {
  async findByNombre(nombre_completo) {
    const [rows] = await pool.query('SELECT * FROM reg_usuarios WHERE TRIM(nombre_completo) = TRIM(?) LIMIT 1', [nombre_completo]);
    return rows[0];
  },
  async updatePasswordHash(id, passwordHash) {
    await pool.query('UPDATE reg_usuarios SET password = ? WHERE id = ?', [passwordHash, id]);
  },
};

module.exports = Usuario;
