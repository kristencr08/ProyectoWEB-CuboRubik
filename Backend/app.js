
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const posRoutes = require('./routes/posRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas existentes
app.use('/api/auth', authRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/caja', cajaRoutes);

// NUEVA RUTA DE INVENTARIO
app.use('/api/inventario', inventarioRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'API Restaurante Orígenes SV activa'
  });
});

const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en el puerto ${PUERTO}`);
});
