
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs/promises');

// ==========================================
// CARGAR VARIABLES DE ENTORNO
// ==========================================

dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

// ==========================================
// CONFIGURACIÓN DE POSTGRESQL
// ==========================================

const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
};

const nombreBaseDatos = process.env.DB_NAME;

// ==========================================
// VALIDAR CONFIGURACIÓN
// ==========================================

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

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nombreBaseDatos)) {
        throw new Error('El nombre de la base de datos no es válido.');
    }

    if (
        !Number.isInteger(config.port) ||
        config.port < 1 ||
        config.port > 65535
    ) {
        throw new Error('El puerto de PostgreSQL no es válido.');
    }
}

// ==========================================
// CONECTAR CON POSTGRESQL
// ==========================================

async function conectarPostgreSQL(baseDatos = 'postgres') {
    const client = new Client({
        ...config,
        database: baseDatos,
        connectionTimeoutMillis: 5000
    });

    await client.connect();

    return client;
}

// ==========================================
// VERIFICAR SI EXISTE LA BASE DE DATOS
// ==========================================

async function verificarBaseDatos(client) {
    const resultado = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [nombreBaseDatos]
    );

    return resultado.rowCount > 0;
}

// ==========================================
// CREAR BASE DE DATOS
// ==========================================

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

// ==========================================
// OBTENER ARCHIVOS SQL EN ORDEN
// ==========================================

async function obtenerArchivosSQL(
    carpeta,
    numeroInicial,
    numeroFinal,
    descripcion
) {
    const archivos = await fs.readdir(carpeta);

    const archivosSQL = archivos
        .filter(archivo => {
            const coincide = archivo.match(/^(\d{2})_.*\.sql$/i);

            if (!coincide) {
                return false;
            }

            const numero = Number(coincide[1]);

            return numero >= numeroInicial && numero <= numeroFinal;
        })
        .sort((a, b) => {
            const numeroA = Number(a.match(/^(\d{2})/)[1]);
            const numeroB = Number(b.match(/^(\d{2})/)[1]);

            return numeroA - numeroB;
        });

    const numerosEncontrados = archivosSQL.map(archivo =>
        Number(archivo.match(/^(\d{2})/)[1])
    );

    const cantidadEsperada = numeroFinal - numeroInicial + 1;

    const secuenciaCompleta = Array.from(
        { length: cantidadEsperada },
        (_, i) => numeroInicial + i
    );

    const faltantes = secuenciaCompleta.filter(
        numero => !numerosEncontrados.includes(numero)
    );

    if (
        archivosSQL.length !== cantidadEsperada ||
        faltantes.length > 0
    ) {
        throw new Error(
            `Se esperaban ${cantidadEsperada} archivos SQL para ${descripcion}. ` +
            `Encontrados: ${archivosSQL.length}. ` +
            `Faltantes: ${faltantes.join(', ') || 'ninguno'}.`
        );
    }

    return archivosSQL;
}

// ==========================================
// EJECUTAR ARCHIVOS SQL
// ==========================================

async function ejecutarArchivosSQL(
    client,
    carpeta,
    numeroInicial,
    numeroFinal,
    descripcion
) {
    const archivos = await obtenerArchivosSQL(
        carpeta,
        numeroInicial,
        numeroFinal,
        descripcion
    );

    console.log('\n====================================');
    console.log(`INICIANDO: ${descripcion.toUpperCase()}`);
    console.log('====================================');

    for (const archivo of archivos) {
        const rutaArchivo = path.join(carpeta, archivo);

        const contenidoSQL = await fs.readFile(
            rutaArchivo,
            'utf8'
        );

        console.log(`\nEjecutando: ${archivo}`);

        try {
            await client.query('BEGIN');

            await client.query(contenidoSQL);

            await client.query('COMMIT');

            console.log(`Correcto: ${archivo}`);

        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});

            throw new Error(
                `Error ejecutando ${archivo}: ${error.message}`
            );
        }
    }

    console.log(`\n${descripcion} ejecutados correctamente.`);
}

// ==========================================
// EJECUTAR ESQUEMA
// ==========================================

async function ejecutarEsquema(client) {
    const carpetaSchema = path.join(__dirname, 'schema');

    await ejecutarArchivosSQL(
        client,
        carpetaSchema,
        0,
        17,
        'Creación del esquema'
    );
}

// ==========================================
// EJECUTAR DATOS DE PRUEBA
// ==========================================

async function ejecutarSeeds(client) {
    const carpetaSeeds = path.join(__dirname, 'seeds');

    await ejecutarArchivosSQL(
        client,
        carpetaSeeds,
        1,
        12,
        'Carga de datos de prueba'
    );
}

// ==========================================
// INICIAR CONFIGURACIÓN
// ==========================================

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

        console.log('\nConexión con la base de datos establecida.');

        // Crear tablas, relaciones, restricciones y funciones
        await ejecutarEsquema(clientBaseDatos);

        // Insertar datos iniciales y de prueba
        await ejecutarSeeds(clientBaseDatos);

        console.log('\n====================================');
        console.log(' INSTALACIÓN FINALIZADA CORRECTAMENTE');
        console.log('====================================');

    } catch (error) {
        console.error('\n====================================');
        console.error(' ERROR DURANTE LA INSTALACIÓN');
        console.error('====================================');

        console.error('Motivo:', error.message);

        process.exitCode = 1;

    } finally {
        if (clientBaseDatos) {
            await clientBaseDatos.end().catch(() => {});
        }

        if (clientServidor) {
            await clientServidor.end().catch(() => {});
        }

        console.log('\nConexiones PostgreSQL cerradas.');
    }
}

iniciarConfiguracion();
