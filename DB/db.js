const { Pool } = require('pg');
const path = require('path');

// Cargar el .env garantizando la ruta absoluta sin importar desde dónde ejecutes node
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); 
// Si tu .env está dentro de la carpeta DB, usa: path.resolve(__dirname, '.env')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''), // Convierte a String para evitar el error SASL
  database: process.env.DB_NAME || 'origenes_sv',
});

module.exports = pool;