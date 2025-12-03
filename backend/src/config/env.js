require('dotenv').config();

const REQUIRED_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
}

const insecureSecrets = ['dev-insecure-secret-change-me', 'changeme', 'secret', 'password'];
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || insecureSecrets.includes(String(JWT_SECRET).trim())) {
  throw new Error('JWT_SECRET es inseguro o no est� configurado. Define un secreto fuerte en el .env');
}

const env = {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT || 3377,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET,
  PORT: process.env.PORT || 4000,
};

module.exports = { env };
