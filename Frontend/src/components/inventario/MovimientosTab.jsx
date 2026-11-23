import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Table, Badge, Button, Input, Label, Alert, Spinner } from 'reactstrap'
import { api } from '../../api/client'
import {
  fmtCantidad, fmtFecha, ETIQUETA_TIPO, COLOR_MOVIMIENTO,
} from '../../utils/formatoInventario'

const FILTROS_INICIALES = { tipo: '', movimiento: '', desde: '', hasta: '' }

// Kardex: historial de entradas, salidas y ajustes de la sucursal del usuario
export default function MovimientosTab() {
  const [movimientos, setMovimientos] = useState([])
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async (filtrosAplicados) => {
    setCargando(true)
    setError('')
    try {
      const data = await api.movimientos({ ...filtrosAplicados, limite: 100 })
      setMovimientos(data.movimientos)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  // Primera carga, sin filtros
  useEffect(() => {
    cargar(FILTROS_INICIALES)
  }, [cargar])

  const cambiar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value })

  const limpiar = () => {
    setFiltros(FILTROS_INICIALES)
    cargar(FILTROS_INICIALES)
  }

  return (
    <>
      <Row className="g-2 mb-3 align-items-end">
        <Col xs={6} md={3}>
          <Label for="mov-tipo" className="small mb-1">Artículo</Label>
          <Input id="mov-tipo" type="select" value={filtros.tipo} onChange={cambiar('tipo')}>
            <option value="">Todos</option>
            <option value="INGREDIENTE">Ingredientes</option>
            <option value="PRODUCTO_DIRECTO">Reventa</option>
          </Input>
        </Col>
        <Col xs={6} md={3}>
          <Label for="mov-mov" className="small mb-1">Movimiento</Label>
          <Input id="mov-mov" type="select" value={filtros.movimiento} onChange={cambiar('movimiento')}>
            <option value="">Todos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SALIDA">Salidas</option>
            <option value="AJUSTE">Ajustes</option>
          </Input>
        </Col>
        <Col xs={6} md={2}>
          <Label for="mov-desde" className="small mb-1">Desde</Label>
          <Input id="mov-desde" type="date" value={filtros.desde} onChange={cambiar('desde')} />
        </Col>
        <Col xs={6} md={2}>
          <Label for="mov-hasta" className="small mb-1">Hasta</Label>
          <Input id="mov-hasta" type="date" value={filtros.hasta} onChange={cambiar('hasta')} />
        </Col>
        <Col xs={12} md={2} className="d-flex gap-2">
          <Button color="primary" onClick={() => cargar(filtros)} disabled={cargando}>
            Filtrar
          </Button>
          <Button color="secondary" outline onClick={limpiar} disabled={cargando}>
            Limpiar
          </Button>
        </Col>
      </Row>

      {error && <Alert color="danger">{error}</Alert>}

      {cargando ? (
        <div className="text-center py-5">
          <Spinner color="primary" />
        </div>
      ) : (
        <Table responsive hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Artículo</th>
              <th className="text-end">Cantidad</th>
              <th>Detalle</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  No hay movimientos con estos filtros.
                </td>
              </tr>
            )}
            {movimientos.map((m) => (
              <tr key={m.movimiento_id}>
                <td className="text-nowrap">{fmtFecha(m.fecha)}</td>
                <td>
                  <Badge color={COLOR_MOVIMIENTO[m.movimiento] || 'secondary'}>
                    {m.movimiento}
                  </Badge>
                </td>
                <td>
                  {m.articulo}
                  <div className="small text-muted">{ETIQUETA_TIPO[m.tipo_articulo]}</div>
                </td>
                <td className="text-end">{fmtCantidad(m.cantidad)}</td>
                <td className="small">{m.descripcion}</td>
                <td className="small">{m.usuario}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
