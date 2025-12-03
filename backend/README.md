# Backend - Sistema de Gestion de Archivos

Backend en Node.js, Express y MySQL para gestionar autenticacion, cajas, inventario y registros.

## Tecnologias principales
- Node.js + Express 5
- MySQL (mysql2/promise)
- dotenv
- multer (uploads Excel) y pdfmake (reportes)
- express-rate-limit (proteccion en /auth/login)

## Variables de entorno requeridas
El arranque falla si falta alguna o si `JWT_SECRET` es inseguro:
- `DB_HOST`, `DB_PORT` (opcional, por defecto 3306), `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (usa un valor largo y aleatorio)
- `PORT` (opcional, por defecto 4000)

## Autenticacion endurecida
- `/auth/login` tiene rate limiting (10 intentos cada 15 minutos por IP).
- Si detecta una clave almacenada en texto plano y el usuario la ingresa correctamente, la migra a bcrypt de forma automatica.
- Las rutas protegidas usan exclusivamente el `JWT_SECRET` configurado (no hay secreto de respaldo).

## Levantar en desarrollo
```bash
cd backend
npm install
npm start
```
