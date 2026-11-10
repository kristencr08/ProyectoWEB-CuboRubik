
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

const nombreBaseDatos = process.env.DB_NAME;

function validarConfiguracion() {
    const faltantes = Object.entries(config)
        .filter(([clave, valor]) => !valor)
        .map(([clave]) => clave);

    if (!nombreBaseDatos) {
        faltantes.push('DB_NAME');
    }

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan variables de configuración: ${faltantes.join(', ')}`
        );
    }

    // Evitar nombres de base de datos con caracteres no permitidos.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nombreBaseDatos)) {
        throw new Error('El nombre de la base de datos no es válido.');
    }
}

// Conectarse al servidor PostgreSQL
async function conectarPostgreSQL() {
    const client = new Client({
        ...config,
        database: 'postgres',
        connectionTimeoutMillis: 5000
    });

    await client.connect();
    return client;
}

// Comprobar si la base de datos existe
async function verificarBaseDatos(client) {
    const resultado = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [nombreBaseDatos]
    );

    return resultado.rowCount > 0;
}

// Crear la base de datos si todavía no existe
async function crearBaseDatos(client) {
    const existe = await verificarBaseDatos(client);

    if (existe) {
        console.log(`\nLa base de datos "${nombreBaseDatos}" ya existe.`);
        console.log('No se realizaron modificaciones.');
        return;
    }

    console.log(`\nLa base de datos "${nombreBaseDatos}" no existe.`);
    console.log('Creando base de datos...');

    // Se valida el nombre antes de utilizarlo en esta consulta.
    await client.query(`CREATE DATABASE "${nombreBaseDatos}"`);

    console.log('\nBase de datos creada correctamente.');
}

// Función principal
async function iniciarConfiguracion() {
    let client;

    try {
        validarConfiguracion();

        console.log('====================================');
        console.log('   CONFIGURACIÓN DE BASE DE DATOS');
        console.log('====================================');
        console.log('Verificando conexión con PostgreSQL...');

        client = await conectarPostgreSQL();

        const resultado = await client.query(
            'SELECT version() AS version'
        );

        console.log('\nConexión establecida correctamente.');
        console.log('Servidor:', resultado.rows[0].version.split(',')[0]);

        await crearBaseDatos(client);

        console.log('\nProceso de configuración finalizado.');

    } catch (error) {
        console.error('\nError durante la configuración de la base de datos.');
        console.error('Motivo:', error.message);
        process.exitCode = 1;

    } finally {
        if (client) {
            await client.end().catch(() => {});
        }
    }
}

iniciarConfiguracion();
