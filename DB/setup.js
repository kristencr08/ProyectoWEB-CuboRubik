
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs/promises');

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

    if (!nombreBaseDatos) faltantes.push('DB_NAME');

    if (faltantes.length > 0) {
        throw new Error(
            `Faltan variables de configuración: ${faltantes.join(', ')}`
        );
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nombreBaseDatos)) {
        throw new Error('El nombre de la base de datos no es válido.');
    }
}

async function conectarPostgreSQL(baseDatos = 'postgres') {
    const client = new Client({
        ...config,
        database: baseDatos,
        connectionTimeoutMillis: 5000
    });

    await client.connect();
    return client;
}

async function verificarBaseDatos(client) {
    const resultado = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [nombreBaseDatos]
    );

    return resultado.rowCount > 0;
}

async function crearBaseDatos(client) {
    const existe = await verificarBaseDatos(client);

    if (existe) {
        console.log(`La base de datos "${nombreBaseDatos}" ya existe.`);
        return;
    }

    console.log(`Creando base de datos "${nombreBaseDatos}"...`);

    await client.query(`CREATE DATABASE "${nombreBaseDatos}"`);

    console.log('Base de datos creada correctamente.');
}

// Obtener los archivos SQL del esquema en orden numérico
async function obtenerArchivosSQL() {
    const carpetaSchema = path.join(__dirname, 'schema');

    const archivos = await fs.readdir(carpetaSchema);

    return archivos
        .filter(archivo => {
            const coincide = archivo.match(/^(\d{2})_.*\.sql$/);
            if (!coincide) return false;

            const numero = Number(coincide[1]);

            return numero >= 0 && numero <= 16;
        })
        .sort((a, b) => {
            const numeroA = Number(a.match(/^(\d{2})/)[1]);
            const numeroB = Number(b.match(/^(\d{2})/)[1]);

            return numeroA - numeroB;
        });
}

// Ejecutar los archivos SQL completos
async function ejecutarEsquema(client) {
    const carpetaSchema = path.join(__dirname, 'schema');
    const archivos = await obtenerArchivosSQL();

    if (archivos.length !== 17) {
        throw new Error(
            `Se esperaban 17 archivos SQL (00-16), pero se encontraron ${archivos.length}.`
        );
    }

    console.log('\nIniciando creación del esquema...');

    for (const archivo of archivos) {
        const rutaArchivo = path.join(carpetaSchema, archivo);
        const contenidoSQL = await fs.readFile(rutaArchivo, 'utf8');

        console.log(`Ejecutando: ${archivo}`);

        try {
    await client.query('BEGIN');

    await client.query(contenidoSQL);

    await client.query('COMMIT');

    console.log(`Correcto: ${archivo}`);

} catch (error) {
    await client.query('ROLLBACK');

    throw new Error(
        `Error ejecutando ${archivo}: ${error.message}`
    );
}
    }

    console.log('\nEsquema creado correctamente.');
}

async function iniciarConfiguracion() {
    let clientServidor;
    let clientBaseDatos;

    try {
        validarConfiguracion();

        console.log('====================================');
        console.log('   CONFIGURACIÓN DE BASE DE DATOS');
        console.log('====================================');

        console.log('\nConectando con PostgreSQL...');

        clientServidor = await conectarPostgreSQL();

        console.log('Conexión establecida correctamente.');

        await crearBaseDatos(clientServidor);

        clientBaseDatos = await conectarPostgreSQL(nombreBaseDatos);

        await ejecutarEsquema(clientBaseDatos);

        console.log('\nInstalación del esquema finalizada.');

    } catch (error) {
        console.error('\nError durante la instalación.');
        console.error('Motivo:', error.message);
        process.exitCode = 1;

    } finally {
        if (clientBaseDatos) {
            await clientBaseDatos.end().catch(() => {});
        }

        if (clientServidor) {
            await clientServidor.end().catch(() => {});
        }
    }
}

iniciarConfiguracion();
