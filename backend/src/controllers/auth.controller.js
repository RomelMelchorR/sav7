// Controlador de autenticacion
const Usuario = require('../models/usuario.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');

const isBcryptHash = (value) => typeof value === 'string' && value.startsWith('$2');

exports.login = async (req, res) => {
  const { nombre_completo, password } = req.body;
  if (!nombre_completo || !password) {
    return res.status(400).json({ error: 'Usuario y contrasena requeridos' });
  }
  try {
    console.log('[auth] intento login usuario:', nombre_completo);
    const usuario = await Usuario.findByNombre(nombre_completo);
    if (!usuario) {
      console.warn('[auth] usuario no encontrado');
      return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
    }

    const storedPassword = usuario.password == null ? '' : String(usuario.password).trim();
    const providedPassword = String(password);

    let passwordValido = false;
    const storedIsHash = isBcryptHash(storedPassword);
    console.log('[auth] password tipo hash:', storedIsHash, 'len almacenada:', storedPassword.length, 'len ingresada:', providedPassword.length);
    console.log('[auth] hash preview almacenada:', storedPassword.slice(0, 6));

    if (storedIsHash) {
      passwordValido = await bcrypt.compare(providedPassword, storedPassword);
    } else if (storedPassword === providedPassword) {
      passwordValido = true;
      try {
        // Migra al vuelo a bcrypt para evitar contrasenas en texto plano
        const hashed = await bcrypt.hash(providedPassword, 10);
        await Usuario.updatePasswordHash(usuario.id, hashed);
        console.log('[auth] password migrada a bcrypt para usuario:', nombre_completo);
      } catch (migrateErr) {
        console.warn('No se pudo migrar la clave del usuario a hash bcrypt:', migrateErr);
      }
    }

    if (!passwordValido) {
      console.warn('[auth] password invalida para usuario:', nombre_completo);
      return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
    }

    console.log('[auth] login OK usuario:', nombre_completo);

    const token = jwt.sign(
      { id: usuario.id, nombre_completo: usuario.nombre_completo },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    const { password: _omit, ...usuarioSinPassword } = usuario;
    res.json({ usuario: usuarioSinPassword, token });
  } catch (error) {
    res.status(500).json({ error: 'Error en el login' });
  }
};
