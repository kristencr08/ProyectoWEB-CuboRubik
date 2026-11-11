const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const app = express();

//Middlewares globales
app.use(cors());
app.use(express.json());

// Montar la ruta de autenticación
app.use('/api/auth', authRoutes);

// Ruta inicial para probar el funcionamiento del servidor
app.get('/', (req, res) => {
    res.json({ ok: true, mensaje: 'API Restaurante Orígenes SV activa'});

});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
    console.log(`Servidor escuchando en el puerto ${PUERTO}`);
})