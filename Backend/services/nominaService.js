const pool = require('../../DB/db');


// UTILIDADES GENERALES
const crearError = (mensaje, status = 400) => {
  const error = new Error(mensaje);
  error.status = status;
  return error;
};

const redondear = (cantidad) =>
  Math.round((cantidad + Number.EPSILON) * 100) / 100;
const aCentavos = (cantidad) =>
  Math.round(Number(cantidad) * 100);
const desdeCentavos = (centavos) =>
  Number((centavos / 100).toFixed(2));
const validarFecha = (fecha) =>
  typeof fecha === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
  !Number.isNaN(Date.parse(`${fecha}T00:00:00`));
const obtenerFechaPago = (fechaInicio, fechaFin) => {
  const inicio = new Date(`${fechaInicio}T00:00:00Z`);
  const fin = new Date(`${fechaFin}T00:00:00Z`);
  const diaInicio = inicio.getUTCDate();
  const diaFin = fin.getUTCDate();

  if (
    diaInicio === 1 &&
    diaFin === 15 &&
    inicio.getUTCMonth() === fin.getUTCMonth() &&
    inicio.getUTCFullYear() === fin.getUTCFullYear()
  ) {
    const pago = new Date(inicio);
    pago.setUTCDate(16);
    return pago.toISOString().slice(0, 10);
  }
  if (diaInicio === 16) {
    const ultimoDia = new Date(
      Date.UTC(
        inicio.getUTCFullYear(),
        inicio.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();
    if (diaFin === ultimoDia) {
      const pago = new Date(
        Date.UTC(
          inicio.getUTCFullYear(),
          inicio.getUTCMonth() + 1,
          1
        )
      );
      return pago.toISOString().slice(0, 10);
    }
  }
  throw crearError(
    'El período debe ser del día 1 al 15 o del 16 al último día del mes.'
  );
};


// CÁLCULOS LEGALES
const calcularISSS = (salarioQuincenal) => {
  // ISSS laboral: 3%, con máximo cotizable mensual de $1,000.
  // Para una quincena se utiliza un máximo de $500.

  const base = Math.min(salarioQuincenal, 500);
  return desdeCentavos(
    Math.round(aCentavos(base) * 0.03)
  );
};

const calcularAFP = (salarioQuincenal) => {
  // Cotización laboral AFP: 7.25%.
  return desdeCentavos(
    Math.round(aCentavos(salarioQuincenal) * 0.0725)
  );
};

const calcularISRQuincenal = ({
  remuneracionGravada,
  isss,
  afp,
  salarioMensual
}) => {
  // La tabla se aplica después de descontar ISSS y AFP.
  let baseGravada = redondear(
    remuneracionGravada - isss - afp
  );

  // Deducción anual de $1,600:
  // se distribuye en 24 períodos para el cálculo ordinario
  // cuando el ingreso anual proyectado no supera $9,100.
  //
  // El recálculo legal de junio y diciembre se implementará
  // como una operación independiente.
  if (salarioMensual * 12 <= 9100) {
    baseGravada = Math.max(
      0,
      redondear(baseGravada - (1600 / 24))
    );
  }
  if (baseGravada <= 275) {
    return 0;
  }
  if (baseGravada <= 447.62) {
    return redondear(
      8.83 + (baseGravada - 275) * 0.10
    );
  }
  if (baseGravada <= 1019.05) {
    return redondear(
      30 + (baseGravada - 447.62) * 0.20
    );
  }
  return redondear(
    144.28 + (baseGravada - 1019.05) * 0.30
  );
};

const calcularNominaEmpleado = ({
  salarioMensual,
  bonificaciones
}) => {
  const salarioQuincenal = redondear(salarioMensual / 2);
  const remuneracionGravada = redondear(
    salarioQuincenal + bonificaciones
  );
  const deduccionISSS = calcularISSS(remuneracionGravada);
  const deduccionAFP = calcularAFP(remuneracionGravada);
  const deduccionISR = calcularISRQuincenal({
    remuneracionGravada,
    isss: deduccionISSS,
    afp: deduccionAFP,
    salarioMensual
  });
  const deducciones = redondear(
    deduccionISSS + deduccionAFP + deduccionISR
  );
  const salarioNeto = redondear(
    salarioQuincenal + bonificaciones - deducciones
  );
  if (salarioNeto < 0) {
    throw crearError(
      'Las deducciones superan el salario del empleado.'
    );
  }

  return {
    salario_base: salarioQuincenal,
    bonificaciones,
    deduccion_isss: deduccionISSS,
    deduccion_afp: deduccionAFP,
    deduccion_isr: deduccionISR,
    deducciones,
    salario_neto: salarioNeto
  };
};


// 1. REGISTRAR EMPLEADO
const registrarEmpleado = async ({
  sucursalId,
  usuarioId = null,
  nombre,
  documento,
  telefono = null,
  correo = null,
  cargo,
  fechaContratacion,
  salarioBase
}) => {
  try {
    const resultado = await pool.query(
      `INSERT INTO core.empleados (
        sucursal_id,
        usuario_id,
        nombre,
        documento,
        telefono,
        correo,
        cargo,
        fecha_contratacion,
        salario_base
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        sucursalId,
        usuarioId,
        nombre.trim(),
        documento.trim(),
        telefono,
        correo,
        cargo.trim(),
        fechaContratacion,
        salarioBase
      ]
    );
    return resultado.rows[0];

  } catch (error) {
    if (error.code === '23505') {
      throw crearError(
        'El documento o usuario ya está asociado a otro empleado.',
        409
      );
    }
    if (error.code === '23503') {
      throw crearError(
        'La sucursal o el usuario indicado no existe.',
        400
      );
    }
    throw error;
  }
};


// 2. CONSULTAR EMPLEADOS POR SUCURSAL
const obtenerEmpleados = async (sucursalId) => {
  const resultado = await pool.query(
    `SELECT
        empleado_id,
        sucursal_id,
        usuario_id,
        nombre,
        documento,
        telefono,
        correo,
        cargo,
        fecha_contratacion,
        salario_base,
        activo
     FROM core.empleados
     WHERE sucursal_id = $1
     ORDER BY nombre`,
    [sucursalId]
  );
  return resultado.rows;
};


// 3. CREAR PLANILLA
const crearPlanilla = async ({
  nombre,
  sucursalId,
  fechaInicio,
  fechaFin,
  observaciones = null
}) => {
  const fechaPago = obtenerFechaPago(
    fechaInicio,
    fechaFin
  );

  try {
    const resultado = await pool.query(
      `INSERT INTO core.planillas (
        nombre,
        sucursal_id,
        fecha_inicio,
        fecha_fin,
        fecha_pago,
        observaciones
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        nombre.trim(),
        sucursalId,
        fechaInicio,
        fechaFin,
        fechaPago,
        observaciones
      ]
    );
    return resultado.rows[0];

  } catch (error) {
    if (error.code === '23505') {
      throw crearError(
        'Ya existe una planilla para esa sucursal y período.',
        409
      );
    }
    if (error.code === '23503') {
      throw crearError(
        'La sucursal indicada no existe.',
        400
      );
    }
    throw error;
  }
};


// 4. GENERAR DETALLE DE PLANILLA
const generarDetallePlanilla = async ({
  planillaId,
  bonificacionesPorEmpleado = []
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const planillaResultado = await client.query(
      `SELECT *
       FROM core.planillas
       WHERE planilla_id = $1
       FOR UPDATE`,
      [planillaId]
    );
    if (planillaResultado.rowCount === 0) {
      throw crearError('La planilla no existe.', 404);
    }

    const planilla = planillaResultado.rows[0];
    if (planilla.estado !== 'PENDIENTE') {
      throw crearError(
        'Solo se puede generar el detalle de una planilla pendiente.',
        409
      );
    }

    const detalleExistente = await client.query(
      `SELECT 1
       FROM core.detalle_planillas
       WHERE planilla_id = $1
       LIMIT 1`,
      [planillaId]
    );
    if (detalleExistente.rowCount > 0) {
      throw crearError(
        'La planilla ya tiene empleados registrados.',
        409
      );
    }
    if (!Array.isArray(bonificacionesPorEmpleado)) {
      throw crearError(
        'Las bonificaciones deben enviarse como una lista.'
      );
    }

    const empleadosResultado = await client.query(
      `SELECT
          empleado_id,
          nombre,
          salario_base
       FROM core.empleados
       WHERE sucursal_id = $1
         AND activo = TRUE
         AND fecha_contratacion <= $2
       ORDER BY empleado_id
       FOR SHARE`,
      [planilla.sucursal_id, planilla.fecha_fin]
    );
    if (empleadosResultado.rowCount === 0) {
      throw crearError(
        'No hay empleados activos para generar esta planilla.',
        409
      );
    }

    const bonificacionesMap = new Map();
    for (const item of bonificacionesPorEmpleado) {
      if (
        !item ||
        !Number.isSafeInteger(Number(item.empleadoId)) ||
        Number(item.empleadoId) <= 0 ||
        !Number.isFinite(item.bonificaciones) ||
        item.bonificaciones < 0
      ) {
        throw crearError(
          'Existe una bonificación con datos inválidos.'
        );
      }

      const id = String(item.empleadoId);
      if (bonificacionesMap.has(id)) {
        throw crearError(
          'No se puede repetir un empleado en las bonificaciones.'
        );
      }

      bonificacionesMap.set(
        id,
        redondear(item.bonificaciones)
      );
    }

    const idsEmpleados = new Set(
      empleadosResultado.rows.map(
        empleado => String(empleado.empleado_id)
      )
    );
    for (const id of bonificacionesMap.keys()) {
      if (!idsEmpleados.has(id)) {
        throw crearError(
          `El empleado ${id} no pertenece a esta planilla o no está activo.`
        );
      }
    }

    const detalles = [];
    for (const empleado of empleadosResultado.rows) {
      const bonificaciones =
        bonificacionesMap.get(
          String(empleado.empleado_id)
        ) || 0;

      const calculo = calcularNominaEmpleado({
        salarioMensual: Number(empleado.salario_base),
        bonificaciones
      });

      const resultado = await client.query(
        `INSERT INTO core.detalle_planillas (
          planilla_id,
          empleado_id,
          salario_base,
          bonificaciones,
          deducciones,
          salario_neto,
          deduccion_isss,
          deduccion_afp,
          deduccion_isr
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
          planillaId,
          empleado.empleado_id,
          calculo.salario_base,
          calculo.bonificaciones,
          calculo.deducciones,
          calculo.salario_neto,
          calculo.deduccion_isss,
          calculo.deduccion_afp,
          calculo.deduccion_isr
        ]
      );
      detalles.push({
        empleado_id: empleado.empleado_id,
        nombre: empleado.nombre,
        ...resultado.rows[0]
      });
    }
    await client.query('COMMIT');
    return {
      planilla_id: planillaId,
      sucursal_id: planilla.sucursal_id,
      cantidad_empleados: detalles.length,
      detalles
    };

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};


// 5. CONSULTAR PLANILLA Y DETALLE
const obtenerPlanilla = async (planillaId) => {
  const resultado = await pool.query(
    `SELECT
        p.*,
        s.nombre AS sucursal,
        COALESCE(
          json_agg(
            json_build_object(
              'detalle_planilla_id', d.detalle_planilla_id,
              'empleado_id', d.empleado_id,
              'empleado', e.nombre,
              'salario_base', d.salario_base,
              'bonificaciones', d.bonificaciones,
              'deduccion_isss', d.deduccion_isss,
              'deduccion_afp', d.deduccion_afp,
              'deduccion_isr', d.deduccion_isr,
              'deducciones', d.deducciones,
              'salario_neto', d.salario_neto
            )
          ) FILTER (WHERE d.detalle_planilla_id IS NOT NULL),
          '[]'::JSON
        ) AS detalles
     FROM core.planillas p
     JOIN core.sucursales s
       ON s.sucursal_id = p.sucursal_id
     LEFT JOIN core.detalle_planillas d
       ON d.planilla_id = p.planilla_id
     LEFT JOIN core.empleados e
       ON e.empleado_id = d.empleado_id
     WHERE p.planilla_id = $1
     GROUP BY p.planilla_id, s.sucursal_id`,
    [planillaId]
  );
  if (resultado.rowCount === 0) {
    throw crearError('La planilla no existe.', 404);
  }
  return resultado.rows[0];
};


// 6. PROCESAR PLANILLA
const procesarPlanilla = async (planillaId) => {
  const resultado = await pool.query(
    `UPDATE core.planillas
     SET estado = 'PROCESADA'
     WHERE planilla_id = $1
       AND estado = 'PENDIENTE'
       AND EXISTS (
         SELECT 1
         FROM core.detalle_planillas d
         WHERE d.planilla_id = core.planillas.planilla_id
       )
     RETURNING *`,
    [planillaId]
  );
  if (resultado.rowCount === 0) {
    throw crearError(
      'No se pudo procesar la planilla. Verifique que exista, esté pendiente y tenga empleados.',
      409
    );
  }
  return resultado.rows[0];
};


// 7. MARCAR PLANILLA COMO PAGADA
const marcarPlanillaPagada = async (planillaId) => {
  const resultado = await pool.query(
    `UPDATE core.planillas
     SET estado = 'PAGADA'
     WHERE planilla_id = $1
       AND estado = 'PROCESADA'
     RETURNING *`,
    [planillaId]
  );
  if (resultado.rowCount === 0) {
    throw crearError(
      'Solo se puede pagar una planilla previamente procesada.',
      409
    );
  }
  return resultado.rows[0];
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
