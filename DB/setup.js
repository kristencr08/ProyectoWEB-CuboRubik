
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');


dotenv.config({
    path: path.resolve(__dirname, '../.env')
});


const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
};


function validarConfiguracion() {
    const faltantes = Object.entries(config)
        .filter(([clave, valor]) => !valor)
        .map(([clave]) => clave);

    if (!process.env.DB_NAME) {
        faltantes.push('DB_NAME');
    }

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan variables de configuración: ${faltantes.join(', ')}`
        );
    }
}

async function comprobarConexion() {
    let client;

    try {
        validarConfiguracion();

        console.log('====================================');
        console.log('   CONFIGURACIÓN DE BASE DE DATOS');
        console.log('====================================');
        console.log('Verificando conexión con PostgreSQL...');

        client = new Client({
            ...config,
            database: 'postgres',
            connectionTimeoutMillis: 5000
        });

        await client.connect();

        const resultado = await client.query(
            'SELECT version() AS version'
        );

        console.log('\nConexión establecida correctamente.');
        console.log('Servidor:', resultado.rows[0].version.split(',')[0]);
        console.log('Base de datos objetivo:', process.env.DB_NAME);

    } catch (error) {
        console.error('\nNo fue posible conectar con PostgreSQL.');
        console.error('Motivo:', error.message);
        process.exitCode = 1;

    } finally {
        if (client) {
            await client.end().catch(() => {});
        }
    }
}

comprobarConexion();
