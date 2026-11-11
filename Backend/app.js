const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const posRoutes = require('./routes/posRoutes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Montar las rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/pos', posRoutes);

// Ruta inicial de prueba
app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API Restaurante Orígenes SV activa' });
});

const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en el puerto ${PUERTO}`);
});