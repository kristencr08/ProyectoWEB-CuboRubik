import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Badge, Button, ButtonGroup, Card, CardBody, Col, Form, FormGroup, Input, Label,
  Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner, Table,
} from 'reactstrap'
import { api } from '../api/client'
import { money, nombreDocumento } from '../utils/formato'
import { soloDocumento, soloTelefono, validarCliente } from '../utils/validaciones'


const IVA = 0.13 // Solo para mostrar el total estimado; el backend calcula el valor real.
const CLIENTE_VACIO = { nombre: '', documento: '', telefono: '', correo: '' }

export default function POS() {
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [turno, setTurno] = useState(null) // { abierto: true/false }
  const [cargando, setCargando] = useState(true)

  const [categoria, setCategoria] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([]) // [{ producto, cantidad }]

  const [tipoDocumento, setTipoDocumento] = useState('FACTURA') // FACTURA | CCF
  const [clienteId, setClienteId] = useState('')
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')

  const [mensaje, setMensaje] = useState(null) // { color, texto }
  const [enviando, setEnviando] = useState(false)
  const [comprobante, setComprobante] = useState(null)

  const [modalCliente, setModalCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState(CLIENTE_VACIO)
  const [errorCliente, setErrorCliente] = useState('')
  const [guardandoCliente, setGuardandoCliente] = useState(false)

  //Carga inicial: productos, clientes y estado de la caja
  useEffect(() => {
    const cargar = async () => {
      try {
        const [p, c, t] = await Promise.all([api.productos(), api.clientes(), api.turnoActual()])
        setProductos(p.productos)
        setClientes(c.clientes)
        setTurno(t)
      } catch (err) {
        setMensaje({ color: 'danger', texto: err.message })
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  //El aviso desaparece solo en cuanto el cajero cambia algo del pedido
  useEffect(() => {
    setMensaje(null)
  }, [carrito, tipoDocumento, clienteId, metodoPago])

  const categorias = useMemo(
    () => ['Todas', ...new Set(productos.map((p) => p.categoria).filter(Boolean))],
    [productos]
  )

  const visibles = productos.filter(
    (p) =>
      (categoria === 'Todas' || p.categoria === categoria) &&
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  //Carrito
  const agregar = (producto) =>
    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto.producto_id === producto.producto_id)
      return existe
        ? prev.map((i) =>
            i.producto.producto_id === producto.producto_id ? { ...i, cantidad: i.cantidad + 1 } : i
          )
        : [...prev, { producto, cantidad: 1 }]
    })

  const cambiarCantidad = (id, delta) =>
    setCarrito((prev) =>
      prev
        .map((i) => (i.producto.producto_id === id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    )

  const subtotal = carrito.reduce((acc, i) => acc + Number(i.producto.precio_venta) * i.cantidad, 0)
  const iva = subtotal * IVA
  const total = subtotal + iva

  //Cliente nuevo(para CCF)
  const guardarCliente = async (e) => {
    e.preventDefault()
    setErrorCliente('')

    const problema = validarCliente(nuevoCliente)
    if (problema) return setErrorCliente(problema)

    setGuardandoCliente(true)
    try {
      const data = await api.crearCliente(nuevoCliente)
      setClientes((prev) => [...prev, data.cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setClienteId(String(data.cliente.cliente_id))
      setNuevoCliente(CLIENTE_VACIO)
      setModalCliente(false)
    } catch (err) {
      setErrorCliente(err.message)
    } finally {
      setGuardandoCliente(false)
    }
  }

  //Cobrar
  const cobrar = async () => {
    setMensaje(null)
    if (carrito.length === 0) return setMensaje({ color: 'warning', texto: 'El pedido está vacío' })
    if (tipoDocumento === 'CCF' && !clienteId)
      return setMensaje({ color: 'warning', texto: 'Para un CCF debes seleccionar o registrar un cliente' })

    setEnviando(true)
    try {
      const data = await api.crearPedido({
        tipoDocumento,
        metodoPago,
        clienteId: tipoDocumento === 'CCF' ? Number(clienteId) : null,
        detalles: carrito.map((i) => ({ producto_id: i.producto.producto_id, cantidad: i.cantidad })),
      })

      const cliente = clientes.find((c) => String(c.cliente_id) === String(clienteId))
      setComprobante({
        ...data.facturacion,
        venta_id: data.venta_id,
        metodoPago,
        cliente: tipoDocumento === 'CCF' ? cliente : null,
        items: carrito,
      })
      setCarrito([])
      setClienteId('')
      setTipoDocumento('FACTURA')
    } catch (err) {
      setMensaje({ color: 'danger', texto: err.message })
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) return <div className="text-center mt-5"><Spinner /></div>

  const sinCaja = turno && turno.abierto === false

  return (
    <div>
      <h2 className="fw-bold mb-3">Punto de venta</h2>

      {sinCaja && (
        <Alert color="warning">
          No hay un turno de caja abierto en tu sucursal. Se necesita abrir caja para poder cobrar.
        </Alert>
      )}

      <Row>
        {/*Catálogo*/}
        <Col lg="8" className="mb-4">
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Input
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ maxWidth: 240 }}
            />
            <ButtonGroup className="flex-wrap">
              {categorias.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  color={categoria === c ? 'warning' : 'outline-secondary'}
                  onClick={() => setCategoria(c)}
                >
                  {c}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <Row className="g-3">
            {visibles.map((p) => (
              <Col key={p.producto_id} xs="6" md="4" xl="3">
                <Card className="producto-card h-100 border-0 shadow-sm" onClick={() => agregar(p)}>
                  <CardBody>
                    <div className="fw-semibold">{p.nombre}</div>
                    <small className="text-muted">{p.categoria}</small>
                    <div className="fw-bold text-warning-emphasis mt-2">{money(p.precio_venta)}</div>
                  </CardBody>
                </Card>
              </Col>
            ))}
            {visibles.length === 0 && <p className="text-muted">No hay productos para mostrar.</p>}
          </Row>
        </Col>

        {/*Pedido*/}
        <Col lg="4">
          <Card className="shadow-sm border-0">
            <CardBody>
              <h5 className="fw-bold">Pedido</h5>

              <ButtonGroup className="w-100 mb-3">
                <Button
                  color={tipoDocumento === 'FACTURA' ? 'dark' : 'outline-dark'}
                  onClick={() => setTipoDocumento('FACTURA')}
                >
                  Consumidor final
                </Button>
                <Button
                  color={tipoDocumento === 'CCF' ? 'dark' : 'outline-dark'}
                  onClick={() => setTipoDocumento('CCF')}
                >
                  Crédito fiscal
                </Button>
              </ButtonGroup>

              {tipoDocumento === 'CCF' && (
                <FormGroup>
                  <Label className="small mb-1">Cliente</Label>
                  <div className="d-flex gap-2">
                    <Input type="select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.cliente_id} value={c.cliente_id}>
                          {c.nombre} ({c.documento})
                        </option>
                      ))}
                    </Input>
                    <Button color="outline-secondary" onClick={() => setModalCliente(true)}>+</Button>
                  </div>
                </FormGroup>
              )}

              {carrito.length === 0 ? (
                <p className="text-muted small">Toca un producto para agregarlo.</p>
              ) : (
                <Table size="sm" borderless className="align-middle">
                  <tbody>
                    {carrito.map(({ producto, cantidad }) => (
                      <tr key={producto.producto_id}>
                        <td>
                          <div className="fw-semibold small">{producto.nombre}</div>
                          <div className="text-muted small">{money(Number(producto.precio_venta) * cantidad)}</div>
                        </td>
                        <td className="text-end text-nowrap">
                          <Button size="sm" color="light" onClick={() => cambiarCantidad(producto.producto_id, -1)}>−</Button>
                          <span className="mx-2">{cantidad}</span>
                          <Button size="sm" color="light" onClick={() => cambiarCantidad(producto.producto_id, 1)}>+</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              <FormGroup>
                <Label className="small mb-1">Método de pago</Label>
                <Input type="select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="BITCOIN">Bitcoin</option>
                  <option value="CHIVO_WALLET">Chivo Wallet</option>
                </Input>
              </FormGroup>

              <div className="border-top pt-2 small">
                <div className="d-flex justify-content-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="d-flex justify-content-between"><span>IVA 13%</span><span>{money(iva)}</span></div>
                <div className="d-flex justify-content-between fs-5 fw-bold"><span>Total</span><span>{money(total)}</span></div>
              </div>

              {mensaje && <Alert color={mensaje.color} toggle={() => setMensaje(null)} className="mt-3 py-2 mb-0">{mensaje.texto}</Alert>}

              <Button color="warning" block className="mt-3 fw-semibold" disabled={enviando || sinCaja} onClick={cobrar}>
                {enviando ? <Spinner size="sm" /> : 'Cobrar'}
              </Button>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/*Modal: registrar cliente*/}
      <Modal isOpen={modalCliente} toggle={() => setModalCliente(false)}>
        <ModalHeader toggle={() => setModalCliente(false)}>Registrar cliente</ModalHeader>
        <Form onSubmit={guardarCliente} noValidate>
          <ModalBody>
            <FormGroup>
              <Label className="small mb-1">Nombre <span className="text-danger">*</span></Label>
              <Input
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                maxLength={150}
              />
            </FormGroup>
            <FormGroup>
              <Label className="small mb-1">Documento (NIT / DUI) <span className="text-danger">*</span></Label>
              <Input
                value={nuevoCliente.documento}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, documento: soloDocumento(e.target.value) })}
                inputMode="numeric"
                maxLength={17}
                
              />
              <small className="text-muted">DUI de 9 dígitos o NIT de 14 dígitos.</small>
            </FormGroup>
            <FormGroup>
              <Label className="small mb-1">Teléfono (opcional)</Label>
              <Input
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: soloTelefono(e.target.value) })}
                inputMode="numeric"
                maxLength={9}
                
              />
            </FormGroup>
            <FormGroup>
              <Label className="small mb-1">Correo (opcional)</Label>
              <Input
                type="email"
                value={nuevoCliente.correo}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
                maxLength={150}
              />
            </FormGroup>
            {errorCliente && <Alert color="danger" className="py-2 mb-0">{errorCliente}</Alert>}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" type="button" onClick={() => setModalCliente(false)}>Cancelar</Button>
            <Button color="warning" disabled={guardandoCliente}>Guardar</Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/*Modal: comprobante*/}
      <Modal isOpen={!!comprobante} toggle={() => setComprobante(null)} centered>
        <ModalHeader toggle={() => setComprobante(null)} className="no-print">Venta registrada</ModalHeader>
        {comprobante && (
          <ModalBody className="comprobante">
            <div className="text-center mb-3">
              <h5 className="fw-bold mb-0">Restaurante Orígenes SV</h5>
              <div className="small text-muted">{nombreDocumento(comprobante.tipoDocumento === 'CCF' ? 'CCF' : 'FACTURA')}</div>
              <Badge color="dark" className="mt-2">{comprobante.serie} · N.º {comprobante.numero}</Badge>
            </div>

            {comprobante.cliente && (
              <div className="small mb-2">
                <strong>Cliente:</strong> {comprobante.cliente.nombre} ({comprobante.cliente.documento})
              </div>
            )}

            <Table size="sm" borderless>
              <tbody>
                {comprobante.items.map(({ producto, cantidad }) => (
                  <tr key={producto.producto_id}>
                    <td>{cantidad} × {producto.nombre}</td>
                    <td className="text-end">{money(Number(producto.precio_venta) * cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="border-top pt-2 small">
              <div className="d-flex justify-content-between"><span>Subtotal</span><span>{money(comprobante.subtotal)}</span></div>
              <div className="d-flex justify-content-between"><span>IVA 13%</span><span>{money(comprobante.iva)}</span></div>
              <div className="d-flex justify-content-between fs-5 fw-bold"><span>Total</span><span>{money(comprobante.total)}</span></div>
              <div className="text-muted mt-1">Pago: {comprobante.metodoPago.replace('_', ' ')}</div>
            </div>
          </ModalBody>
        )}
        <ModalFooter className="no-print">
          <Button color="outline-secondary" onClick={() => window.print()}>Imprimir</Button>
          <Button color="warning" onClick={() => setComprobante(null)}>Nueva venta</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
