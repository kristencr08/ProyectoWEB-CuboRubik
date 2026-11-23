import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Row, Col, Card, CardBody, Table, Badge, Button, Input, Alert, Spinner,
  Nav, NavItem, NavLink,
} from 'reactstrap'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { fmtCantidad, fmtCosto, ETIQUETA_TIPO, ESTADO_STOCK } from '../utils/formatoInventario'
import ModalAjuste from '../components/inventario/ModalAjuste'
import ModalStockMinimo from '../components/inventario/ModalStockMinimo'
import IngredientesTab from '../components/inventario/IngredientesTab'
import MovimientosTab from '../components/inventario/MovimientosTab'

// El backend (inventarioRoutes) solo deja modificar a estos roles; aquí se usan
// únicamente para ocultar los botones. La validación real la hace el servidor.
const ROLES_GESTION = ['ADMINISTRADOR', 'GERENTE']

export default function Inventario() {
  const { user } = useAuth()
  const puedeGestionar = ROLES_GESTION.includes(String(user?.rol).toUpperCase())

  const [tab, setTab] = useState('stock')

  // Datos del servidor
  const [inventario, setInventario] = useState([])
  const [sucursal, setSucursal] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  // Filtros de la tabla (se aplican en el navegador, sin volver a llamar a la API)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [soloAlertas, setSoloAlertas] = useState(false)

  // null = sin modal, o { tipo: 'ajuste' | 'minimo', articulo }
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const data = await api.inventario()
      setInventario(data.inventario)
      setSucursal(data.sucursal)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const bajos = inventario.filter((a) => a.estado_stock === 'BAJO').length
  const agotados = inventario.filter((a) => a.estado_stock === 'SIN_STOCK').length

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return inventario.filter(
      (a) =>
        (!filtroTipo || a.tipo === filtroTipo) &&
        (!soloAlertas || a.estado_stock !== 'OK') &&
        (!texto ||
          a.nombre.toLowerCase().includes(texto) ||
          (a.codigo || '').toLowerCase().includes(texto)),
    )
  }, [inventario, busqueda, filtroTipo, soloAlertas])

  const alGuardar = (texto) => {
    setModal(null)
    setMensaje(texto)
    cargar()
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Inventario</h4>
          {sucursal?.nombre && <small className="text-muted">{sucursal.nombre}</small>}
        </div>
        <Button color="secondary" outline onClick={cargar} disabled={cargando}>
          <i className="bi bi-arrow-clockwise me-1" />
          Actualizar
        </Button>
      </div>

      <Nav tabs className="mb-3">
        {[
          ['stock', 'Existencias'],
          ['ingredientes', 'Ingredientes'],
          ['movimientos', 'Movimientos'],
        ].map(([clave, texto]) => (
          <NavItem key={clave}>
            <NavLink
              href="#"
              active={tab === clave}
              onClick={(e) => {
                e.preventDefault()
                setTab(clave)
              }}
            >
              {texto}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      {tab === 'ingredientes' && (
        <IngredientesTab puedeGestionar={puedeGestionar} onCambio={cargar} />
      )}

      {tab === 'movimientos' && <MovimientosTab />}

      {tab === 'stock' && (
        <>
          {error && <Alert color="danger">{error}</Alert>}
          {mensaje && (
            <Alert color="success" toggle={() => setMensaje('')}>
              {mensaje}
            </Alert>
          )}

          <Row className="g-3 mb-3">
            <Col xs={4}>
              <Card>
                <CardBody className="py-2">
                  <div className="text-muted small">Artículos</div>
                  <div className="fs-4">{inventario.length}</div>
                </CardBody>
              </Card>
            </Col>
            <Col xs={4}>
              <Card>
                <CardBody className="py-2">
                  <div className="text-muted small">Stock bajo</div>
                  <div className="fs-4 text-warning">{bajos}</div>
                </CardBody>
              </Card>
            </Col>
            <Col xs={4}>
              <Card>
                <CardBody className="py-2">
                  <div className="text-muted small">Sin stock</div>
                  <div className="fs-4 text-danger">{agotados}</div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {bajos + agotados > 0 && !soloAlertas && (
            <Alert color="warning" className="d-flex justify-content-between align-items-center">
              <span>
                {bajos + agotados} artículo(s) necesitan reposición.
              </span>
              <Button size="sm" color="warning" onClick={() => setSoloAlertas(true)}>
                Ver solo esos
              </Button>
            </Alert>
          )}

          <Row className="g-2 mb-3 align-items-center">
            <Col md={5}>
              <Input
                type="search"
                placeholder="Buscar por nombre o código"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Input
                type="select"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="INGREDIENTE">Ingredientes</option>
                <option value="PRODUCTO_DIRECTO">Reventa</option>
              </Input>
            </Col>
            <Col md={4}>
              <Input
                id="solo-alertas"
                type="checkbox"
                className="me-2"
                checked={soloAlertas}
                onChange={(e) => setSoloAlertas(e.target.checked)}
              />
              <label htmlFor="solo-alertas">Solo con alerta de stock</label>
            </Col>
          </Row>

          {cargando ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : (
            <Table responsive hover className="align-middle">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Artículo</th>
                  <th>Tipo</th>
                  <th className="text-end">Existencia</th>
                  <th className="text-end">Mínimo</th>
                  <th className="text-end">Último costo</th>
                  <th>Estado</th>
                  {puedeGestionar && <th />}
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={puedeGestionar ? 8 : 7} className="text-center text-muted py-4">
                      No hay artículos que coincidan con los filtros.
                    </td>
                  </tr>
                )}
                {visibles.map((a) => {
                  const estado = ESTADO_STOCK[a.estado_stock] || ESTADO_STOCK.OK
                  return (
                    <tr key={`${a.tipo}-${a.articulo_id}`}>
                      <td>{a.codigo}</td>
                      <td>{a.nombre}</td>
                      <td>{ETIQUETA_TIPO[a.tipo]}</td>
                      <td className="text-end">
                        {fmtCantidad(a.stock)} {a.unidad}
                      </td>
                      <td className="text-end">
                        {fmtCantidad(a.stock_minimo)} {a.unidad}
                      </td>
                      <td className="text-end">{fmtCosto(a.ultimo_costo)}</td>
                      <td>
                        <Badge color={estado.color}>{estado.texto}</Badge>
                      </td>
                      {puedeGestionar && (
                        <td className="text-end text-nowrap">
                          <Button
                            size="sm"
                            color="primary"
                            outline
                            className="me-1"
                            onClick={() => setModal({ tipo: 'ajuste', articulo: a })}
                          >
                            Ajustar
                          </Button>
                          <Button
                            size="sm"
                            color="secondary"
                            outline
                            onClick={() => setModal({ tipo: 'minimo', articulo: a })}
                          >
                            Mínimo
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </>
      )}

      {modal?.tipo === 'ajuste' && (
        <ModalAjuste
          articulo={modal.articulo}
          onClose={() => setModal(null)}
          onGuardado={alGuardar}
        />
      )}
      {modal?.tipo === 'minimo' && (
        <ModalStockMinimo
          articulo={modal.articulo}
          onClose={() => setModal(null)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}
