import { useEffect, useMemo, useState, useCallback } from 'react'
import { Row, Col, Card, CardBody, Table, Badge, Input, Alert, Spinner } from 'reactstrap'
import { api } from '../api/client'
import { fmtCosto, fmtDia, ESTADO_CXP } from '../utils/formatoInventario'
import GrupoFiltro from '../components/GrupoFiltro'
import ModalCuenta from '../components/cuentas/ModalCuenta'

// La ruta /cuentas-por-pagar solo la ven ADMINISTRADOR y GERENTE (utils/permisos.js),
// y el backend exige el mismo rol, por eso aquí no hace falta ocultar botones.
// Las cuentas se crean solas al recibir una compra (pantalla de Compras).
export default function CuentasPorPagar() {
  const [cuentas, setCuentas] = useState([])
  const [resumen, setResumen] = useState(null)
  // '' | PENDIENTE | PARCIAL | PAGADA | VENCIDAS
  const [filtro, setFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [detalle, setDetalle] = useState(null) // la cuenta abierta, con sus pagos
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // "Vencidas" no es un estado: el backend lo pide con vencidas=true
      const parametros = { limite: 100 }
      if (filtro === 'VENCIDAS') parametros.vencidas = 'true'
      else if (filtro) parametros.estado = filtro

      // La lista y el resumen son independientes, se piden al mismo tiempo
      const [resCuentas, resResumen] = await Promise.all([
        api.cuentasPorPagar(parametros),
        api.resumenCuentas(),
      ])
      setCuentas(resCuentas.cuentas)
      setResumen(resResumen.resumen)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [filtro])

  useEffect(() => {
    cargar()
  }, [cargar])

  const abrirDetalle = async (id) => {
    setCargandoDetalle(true)
    setError('')
    try {
      const data = await api.cuentaPorPagar(id)
      setDetalle(data.cuenta)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargandoDetalle(false)
    }
  }

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return cuentas.filter(
      (c) =>
        !texto ||
        (c.numero_documento || '').toLowerCase().includes(texto) ||
        c.proveedor.toLowerCase().includes(texto),
    )
  }, [cuentas, busqueda])

  // Texto pequeño bajo la fecha de vencimiento
  const avisoVencimiento = (c) => {
    if (Number(c.saldo) <= 0) return null
    if (c.vencida) {
      return <div className="small text-danger">Vencida hace {Math.abs(Number(c.dias_para_vencer))} día(s)</div>
    }
    const dias = Number(c.dias_para_vencer)
    if (dias <= 7) {
      return <div className="small text-muted">{dias === 0 ? 'Vence hoy' : `Vence en ${dias} día(s)`}</div>
    }
    return null
  }

  const tarjetas = resumen
    ? [
        ['Saldo pendiente', fmtCosto(resumen.total_pendiente), ''],
        ['Vencido', fmtCosto(resumen.total_vencido), 'text-danger'],
        ['Vence en 7 días', fmtCosto(resumen.por_vencer_7_dias), 'text-warning'],
        ['Cuentas abiertas', Number(resumen.cuentas_abiertas), ''],
      ]
    : []

  return (
    <div>
      <h2 className="fw-bold mb-3">Cuentas por pagar</h2>

      {error && <Alert color="danger" toggle={() => setError('')}>{error}</Alert>}

      {resumen && (
        <>
          <Row className="g-3 mb-2">
            {tarjetas.map(([titulo, valor, clase]) => (
              <Col xs={6} md={3} key={titulo}>
                <Card>
                  <CardBody className="py-2">
                    <div className="text-muted small">{titulo}</div>
                    <div className={`fs-4 ${clase}`}>{valor}</div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
          {resumen.por_proveedor.length > 0 && (
            <div className="small text-muted mb-3">
              Saldo por proveedor:{' '}
              {resumen.por_proveedor
                .map((p) => `${p.proveedor} ${fmtCosto(p.saldo)}`)
                .join(' · ')}
            </div>
          )}
        </>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Input
          placeholder="Buscar por documento o proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <GrupoFiltro
          opciones={[
            ['', 'Todas'],
            ['PENDIENTE', 'Pendientes'],
            ['PARCIAL', 'Parciales'],
            ['PAGADA', 'Pagadas'],
            ['VENCIDAS', 'Vencidas'],
          ]}
          valor={filtro}
          onChange={setFiltro}
        />
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Compra</th>
                <th>Proveedor</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th className="text-end">Total</th>
                <th className="text-end">Saldo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    {cuentas.length === 0
                      ? 'No hay cuentas por pagar. Se generan al recibir una compra.'
                      : 'No hay cuentas que coincidan con la búsqueda.'}
                  </td>
                </tr>
              )}
              {visibles.map((c) => {
                const e = ESTADO_CXP[c.estado] || ESTADO_CXP.PENDIENTE
                return (
                  <tr key={c.cxp_id} className="fila-click" onClick={() => abrirDetalle(c.cxp_id)}>
                    <td>{c.numero_documento}</td>
                    <td>{c.proveedor}</td>
                    <td>{fmtDia(c.fecha_emision)}</td>
                    <td>
                      {fmtDia(c.fecha_vencimiento)}
                      {avisoVencimiento(c)}
                    </td>
                    <td className="text-end">{fmtCosto(c.monto_total)}</td>
                    <td className="text-end">{fmtCosto(c.saldo)}</td>
                    <td>
                      <Badge color={e.color}>{e.texto}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}

      {cargandoDetalle && <Spinner size="sm" className="mt-2" />}

      {detalle && (
        <ModalCuenta cuenta={detalle} onClose={() => setDetalle(null)} onActualizado={cargar} />
      )}
    </div>
  )
}
