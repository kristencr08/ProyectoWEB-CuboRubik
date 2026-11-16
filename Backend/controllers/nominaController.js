const nominaService = require('../services/nominaService');
const {
    validarEmpleado,
    validarPlanilla,
    validarBonificaciones,
    esIdValido
} = require('../validators/nominaValidation');


// MANEJO DE ERRORES
const manejarError = (res, error) => {
    console.error('Error en módulo de nómina:', error);
    // Restricciones de duplicidad
    if (error.code === '23505') {
        return res.status(409).json({
            ok: false,
            mensaje: 'El registro ya existe o está duplicado.'
        });
    }
    // Restricciones de claves foráneas
    if (error.code === '23503') {
        return res.status(400).json({
            ok: false,
            mensaje: 'La sucursal, empleado o planilla indicada no existe.'
        });
    }
    // Restricciones CHECK de PostgreSQL
    if (error.code === '23514') {
        return res.status(400).json({
            ok: false,
            mensaje: 'Los datos no cumplen las reglas de nómina.'
        });
    }
    return res.status(500).json({
        ok: false,
        mensaje: 'Ocurrió un error interno al procesar la operación.'
    });
};


// 1. REGISTRAR EMPLEADO
const registrarEmpleado = async (req, res) => {
    try {
        const datos = req.body;
        const validacion = validarEmpleado(datos);
        if (!validacion.valido) {
            return res.status(400).json({
                ok: false,
                errores: validacion.errores
            });
        }

        const empleado = await nominaService.registrarEmpleado({
            sucursalId: datos.sucursalId,
            usuarioId: datos.usuarioId ?? null,
            nombre: datos.nombre,
            documento: datos.documento,
            telefono: datos.telefono ?? null,
            correo: datos.correo ?? null,
            cargo: datos.cargo,
            fechaContratacion: datos.fechaContratacion,
            salarioBase: datos.salarioBase
        });
        return res.status(201).json({
            ok: true,
            mensaje: 'Empleado registrado correctamente.',
            empleado
        });

    } catch (error) {
        return manejarError(res, error);
    }
};


// 2. OBTENER EMPLEADOS DE UNA SUCURSAL
const obtenerEmpleados = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        if (!esIdValido(sucursalId)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El identificador de la sucursal no es válido.'
            });
        }

        const empleados = await nominaService.obtenerEmpleados(
            sucursalId
        );
        return res.status(200).json({
            ok: true,
            total: empleados.length,
            empleados
        });

    } catch (error) {
        return manejarError(res, error);
    }
};


// 3. CREAR PLANILLA QUINCENAL
const crearPlanilla = async (req, res) => {
    try {
        const datos = req.body;
        const validacion = validarPlanilla(datos);
        if (!validacion.valido) {
            return res.status(400).json({
                ok: false,
                errores: validacion.errores
            });
        }

        const planilla = await nominaService.crearPlanilla({
            nombre: datos.nombre,
            sucursalId: datos.sucursalId,
            fechaInicio: datos.fechaInicio,
            fechaFin: datos.fechaFin,
            observaciones: datos.observaciones ?? null
        });
        return res.status(201).json({
            ok: true,
            mensaje: 'Planilla creada correctamente.',
            planilla
        });

    } catch (error) {
        return manejarError(res, error);
    }
};


// 4. GENERAR DETALLE DE PLANILLA
const generarDetallePlanilla = async (req, res) => {
    try {
        const { planillaId } = req.params;
        const { bonificacionesPorEmpleado = [] } = req.body || {};
        if (!esIdValido(planillaId)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El identificador de la planilla no es válido.'
            });
        }
        if (!Array.isArray(bonificacionesPorEmpleado)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Las bonificaciones deben enviarse como una lista.'
            });
        }

        const detalles = await nominaService.generarDetallePlanilla({
            planillaId,
            bonificacionesPorEmpleado
        });
        return res.status(200).json({
            ok: true,
            mensaje: 'Detalle de planilla generado correctamente.',
            detalles
        });

    } catch (error) {
        return manejarError(res, error);
    }
};


// 5. CONSULTAR PLANILLA
const obtenerPlanilla = async (req, res) => {
    try {
        const { planillaId } = req.params;
        if (!esIdValido(planillaId)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El identificador de la planilla no es válido.'
            });
        }

        const planilla = await nominaService.obtenerPlanilla(
            planillaId
        );
        if (!planilla) {
            return res.status(404).json({
                ok: false,
                mensaje: 'No se encontró la planilla solicitada.'
            });
        }
        return res.status(200).json({
            ok: true,
            planilla
        });

    } catch (error) {
        return manejarError(res, error);
    }
};


// 6. PROCESAR PLANILLA
const procesarPlanilla = async (req, res) => {
    try {
        const { planillaId } = req.params;
        if (!esIdValido(planillaId)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El identificador de la planilla no es válido.'
            });
        }

        const resultado = await nominaService.procesarPlanilla(
            planillaId
        );
        return res.status(200).json({
            ok: true,
            mensaje: 'Planilla procesada correctamente.',
            resultado
        });

    } catch (error) {
        return manejarError(res, error);
    }
};


// 7. MARCAR PLANILLA COMO PAGADA
const marcarPlanillaPagada = async (req, res) => {
    try {
        const { planillaId } = req.params;
        if (!esIdValido(planillaId)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El identificador de la planilla no es válido.'
            });
        }

        const resultado = await nominaService.marcarPlanillaPagada(
            planillaId
        );
        return res.status(200).json({
            ok: true,
            mensaje: 'Planilla marcada como pagada correctamente.',
            resultado
        });

    } catch (error) {
        return manejarError(res, error);
    }
};


// EXPORTACIONES
module.exports = {
    registrarEmpleado,
    obtenerEmpleados,
    crearPlanilla,
    generarDetallePlanilla,
    obtenerPlanilla,
    procesarPlanilla,
    marcarPlanillaPagada
};
