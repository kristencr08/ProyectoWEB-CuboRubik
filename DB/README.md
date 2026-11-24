# Base de Datos – Restaurante Orígenes SV

## 1. Descripción general

Este módulo contiene el diseño, estructura, configuración y automatización de la base de datos del sistema ERP/POS de **Restaurante Orígenes SV**.

La base de datos está desarrollada en PostgreSQL y permite gestionar las operaciones principales del restaurante, incluyendo sucursales, usuarios, productos, ingredientes, inventario, compras, ventas, pagos, facturación, cajas, turnos y devoluciones.

Además, cuenta con un instalador automático desarrollado con Node.js que permite crear la estructura de la base de datos y cargar los datos iniciales y de prueba.

## 2. Tecnologías utilizadas

| Tecnología | Función |
|---|---|
| PostgreSQL | Sistema gestor de base de datos relacional. |
| Node.js | Ejecución del instalador automático. |
| pg | Conexión entre Node.js y PostgreSQL. |
| dotenv | Administración de variables de entorno. |
| pgAdmin 4 | Administración y consulta de la base de datos. |
| SQL | Creación de tablas, relaciones, restricciones y funciones. |

## 3. Estructura del módulo

```text
DB/
├── diagrams/
├── queries/
├── schema/
│   ├── 00_create_schema.sql
│   ├── 01_sucursales_roles_usuarios.sql
│   ├── 02_clientes.sql
│   ├── 03_cajas_turnos.sql
│   ├── 04_ventas.sql
│   ├── 05_productos_categorias.sql
│   ├── 06_ingredientes_unidades.sql
│   ├── 07_recetas.sql
│   ├── 08_inventario.sql
│   ├── 09_proveedores_compras.sql
│   ├── 10_detalle_ventas_pagos.sql
│   ├── 11_facturacion.sql
│   ├── 12_empleados_planilla.sql
│   ├── 13_ajustes_integridad.sql
│   ├── 14_integracion_pagos_caja.sql
│   ├── 15_tablas_devoluciones.sql
│   ├── 16_integridad_devoluciones.sql
│   └── 17_funciones_devoluciones.sql
├── seeds/
│   ├── 01_datos_base.sql
│   ├── 02_productos_ingredientes.sql
│   ├── 03_recetas.sql
│   ├── 04_cajas.sql
│   ├── 05_usuarios.sql
│   ├── 06_empleados.sql
│   ├── 07_turnos_caja.sql
│   ├── 08_existencias_iniciales.sql
│   ├── 09_compras_prueba.sql
│   ├── 10_recibir_compra_prueba.sql
│   ├── 11_venta_prueba.sql
│   └── 12_venta_producto_directo.sql
├── README.md
└── setup.js
```

## 4. Módulos implementados

La base de datos contiene 30 tablas dentro del esquema `core`.

### Administración
- Sucursales.
- Roles.
- Usuarios.
- Clientes.

### Operaciones del restaurante
- Productos.
- Categorías.
- Ingredientes.
- Unidades de medida.
- Recetas.

### Inventario y compras
- Existencias de productos.
- Existencias de ingredientes.
- Movimientos de inventario.
- Proveedores.
- Compras.
- Detalles de compras.

### Ventas y facturación
- Ventas.
- Detalles de ventas.
- Métodos de pago.
- Pagos.
- Facturas.

### Administración de caja
- Cajas.
- Turnos de caja.
- Movimientos de caja.

### Devoluciones
- Devoluciones.
- Detalles de devoluciones.
- Pagos de devoluciones.

### Recursos humanos
- Empleados.
- Planillas.
- Detalles de planillas.

## 5. Reglas de negocio implementadas

- Cada usuario pertenece a una sucursal y tiene un único rol.
- Cada sucursal tiene una caja asignada.
- Una caja puede tener diferentes turnos.
- Una venta genera su correspondiente factura.
- Los precios de los productos se manejan sin IVA y el impuesto se calcula por separado.
- Se permiten diferentes métodos de pago: efectivo, tarjeta, Bitcoin y Chivo Wallet.
- Se permite dividir el pago de una venta entre varios métodos.
- Los productos pueden ser elaborados o directos.
- Los productos elaborados consumen ingredientes mediante recetas.
- Los productos directos se compran terminados y se venden sin preparación.
- Las devoluciones pueden ser parciales o completas.
- Las devoluciones requieren autorización de un usuario con rol ADMINISTRADOR o GERENTE.
- Las cantidades devueltas no pueden superar las cantidades vendidas.
- Los reembolsos se distribuyen según los pagos originales.
- Los reembolsos en efectivo generan movimientos de egreso en caja.
- Las devoluciones no restauran automáticamente el inventario.

## 6. Requisitos de instalación

Para instalar y ejecutar el módulo se necesita:

- Git.
- Node.js.
- PostgreSQL.
- pgAdmin 4 (recomendado).

## 7. Instalación del proyecto

### Paso 1. Descargar el repositorio

Clonar el repositorio desde GitHub:

```bash
git clone URL_DEL_REPOSITORIO
```

Ingresar a la carpeta del proyecto:

```bash
cd ProyectoWEB-CuboRubik
```

### Paso 2. Instalar dependencias

Desde la carpeta raíz ejecutar:

```bash
npm install
```

Este comando instala las dependencias definidas en `package.json`, incluyendo `pg` y `dotenv`.

### Paso 3. Configurar las variables de entorno

Crear un archivo `.env` en la raíz del proyecto tomando como referencia `.env.example`.

Configurar los datos de conexión de PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_NAME=origenes_sv
```

**Importante:**
- Cada integrante debe colocar sus propios datos de conexión.
- La contraseña corresponde al usuario local de PostgreSQL.
- El archivo `.env` no debe subirse a GitHub.
- No compartir credenciales personales.

### Paso 4. Ejecutar el instalador

Desde la carpeta raíz del proyecto ejecutar:

```bash
node DB/setup.js
```

El instalador realiza automáticamente las siguientes operaciones:

1. Lee y valida las variables de entorno.
2. Se conecta al servidor PostgreSQL.
3. Comprueba si existe la base de datos.
4. Crea la base de datos si todavía no existe.
5. Ejecuta los archivos SQL del esquema, desde el archivo 00 hasta el 17.
6. Ejecuta los archivos de datos iniciales y de prueba, desde el 01 hasta el 12.
7. Cierra las conexiones con PostgreSQL.

Si la instalación finaliza correctamente, se mostrará:

```text
INSTALACIÓN FINALIZADA CORRECTAMENTE
```

## 8. Datos de prueba

El proyecto incluye datos iniciales para facilitar las pruebas.

### Sucursales
- Central.
- Norte.

### Roles
- ADMINISTRADOR.
- CAJERO.
- COCINERO.
- GERENTE.

### Productos

| Código | Producto | Tipo | Precio |
|---|---|---|---:|
| PUP-001 | Pupusa de queso | ELABORADO | $1.00 |
| PUP-002 | Pupusa de frijol con queso | ELABORADO | $1.25 |
| BEB-001 | Agua embotellada | DIRECTO | $0.75 |
| BEB-002 | Gaseosa | DIRECTO | $1.00 |

También se incluyen ingredientes, recetas, existencias iniciales, compras, ventas y turnos de caja para realizar pruebas.

## 9. Verificación de la instalación

Después de ejecutar el instalador, ingresar a pgAdmin 4 y seleccionar la base de datos `origenes_sv`.

Para comprobar la cantidad de tablas:

```sql
SELECT COUNT(*) AS total_tablas
FROM information_schema.tables
WHERE table_schema = 'core'
AND table_type = 'BASE TABLE';
```

Resultado esperado:

```text
30
```

Para verificar la función de devoluciones:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE specific_schema = 'core'
AND routine_name = 'procesar_devolucion';
```

Debe aparecer:

```text
procesar_devolucion
```

Para verificar los datos iniciales:

```sql
SELECT
    (SELECT COUNT(*) FROM core.sucursales) AS sucursales,
    (SELECT COUNT(*) FROM core.usuarios) AS usuarios,
    (SELECT COUNT(*) FROM core.productos) AS productos,
    (SELECT COUNT(*) FROM core.ingredientes) AS ingredientes,
    (SELECT COUNT(*) FROM core.ventas) AS ventas;
```

Resultados esperados:

| Elemento | Cantidad |
|---|---:|
| Sucursales | 2 |
| Usuarios | 4 |
| Productos | 4 |
| Ingredientes | 4 |
| Ventas | 2 |

## 10. Automatización e integridad

El archivo `DB/setup.js` permite automatizar la creación de la base de datos y la ejecución de los scripts SQL en orden numérico.

Cada archivo SQL se ejecuta dentro de una transacción administrada por el instalador. Si ocurre un error, se intenta revertir la ejecución del archivo correspondiente.

Los scripts de estructura incluyen mecanismos para facilitar su ejecución repetida, aunque no sustituyen un sistema completo de migraciones de versiones.

## 11. Consideraciones importantes

- No modificar directamente la base de datos de otros integrantes.
- No compartir archivos `.env` ni contraseñas.
- Mantener actualizados los scripts SQL del repositorio.
- Ejecutar los scripts en el orden establecido.
- Realizar pruebas en bases de datos independientes antes de aplicar cambios importantes.
- El instalador carga datos de prueba, por lo que no debe utilizarse como procedimiento de despliegue de producción sin adaptar los seeds y las políticas de instalación.

## 12. Estado del desarrollo

La estructura de la base de datos, las relaciones, las restricciones, las funciones principales, los datos de prueba y la automatización de instalación se encuentran implementados.

La base de datos está preparada para continuar con la integración del backend del sistema ERP/POS de Restaurante Orígenes SV.

### Tecnologías principales

PostgreSQL | Node.js | SQL | pg | dotenv
