const bcrypt = require('bcryptjs');

async function generarHashes() {
    const contrasena = 'PruebaRestaurante2026!';

    const hash = await bcrypt.hash(contrasena, 12);

    console.log('Hash generado:');
    console.log(hash);
}

generarHashes();