const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const posRoutes = require('./routes/posRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const nominaRoutes = require('./routes/nominaRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const comprasRoutes = require('./routes/comprasRoutes');
const cuentasPagarRoutes = require('./routes/cuentasPagarRoutes');
const recetasRoutes = require('./routes/recetasRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const facturasRoutes = require('./routes/facturasRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas existentes
app.use('/api/auth', authRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/nomina', nominaRoutes);

// Inventario, recetas, compras y cuentas por pagar
app.use('/api/inventario', inventarioRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/cuentas-por-pagar', cuentasPagarRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/facturas', facturasRoutes);

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