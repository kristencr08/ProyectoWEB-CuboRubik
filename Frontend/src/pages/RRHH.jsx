import { useEffect, useState } from 'react'
import {
  Alert, Badge, Button, Card, CardBody, Col, Form, FormGroup, Input,
  Label, Modal, ModalBody, ModalFooter, ModalHeader, Nav, NavItem,
  NavLink, Row, Spinner, Table,
} from 'reactstrap'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { money } from '../utils/formato'

const EMPLEADO_VACIO = {
  nombre: '', documento: '', telefono: '', correo: '',
  cargo: '', fechaContratacion: '', salarioBase: '',
}
const PLANILLA_VACIA = {
  nombre: '', fechaInicio: '', fechaFin: '', observaciones: '',
}

export default function RRHH() {
  const { user } = useAuth()
  const sucursalId = user?.sucursal?.id

  const [tab, setTab] = useState('empleados')
  const [empleados, setEmpleados] = useState([])
  const [planillas, setPlanillas] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [boleta, setBoleta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [modalEmpleado, setModalEmpleado] = useState(false)
  const [empleado, setEmpleado] = useState(EMPLEADO_VACIO)
  const [modalPlanilla, setModalPlanilla] = useState(false)
  const [planilla, setPlanilla] = useState(PLANILLA_VACIA)

  const cargar = async () => {
    setCargando(true)
    setMensaje(null)
    const [empleadosResult, planillasResult] = await Promise.allSettled([
      api.empleados(sucursalId),
      api.planillas(sucursalId),
    ])
    const errores = []

    if (empleadosResult.status === 'fulfilled') {
      setEmpleados(empleadosResult.value.empleados)
    } else {
      setEmpleados([])
      errores.push(`Empleados: ${empleadosResult.reason.message}`)
    }

    if (planillasResult.status === 'fulfilled') {
      setPlanillas(planillasResult.value.planillas)
    } else {
      setPlanillas([])
      errores.push(`Planillas: ${planillasResult.reason.message}`)
    }

    if (errores.length) setMensaje({ color: 'danger', texto: errores.join('. ') })
    setCargando(false)
  }

  useEffect(() => {
    if (sucursalId) cargar()
  }, [sucursalId])

  const ejecutar = async (accion, textoExito) => {
    setEnviando(true)
    setMensaje(null)
    try {
      await accion()
      setMensaje({ color: 'success', texto: textoExito })
      await cargar()
    } catch (error) {
      setMensaje({ color: 'danger', texto: error.message })
    } finally {
      setEnviando(false)
    }
  }

  const guardarEmpleado = (e) => {
    e.preventDefault()
    ejecutar(
      () => api.crearEmpleado({
        sucursalId,
        nombre: empleado.nombre,
        documento: empleado.documento,
        telefono: empleado.telefono || null,
        correo: empleado.correo || null,
        cargo: empleado.cargo,
        fechaContratacion: empleado.fechaContratacion,
        salarioBase: Number(empleado.salarioBase),
      }).then(() => {
        setEmpleado(EMPLEADO_VACIO)
        setModalEmpleado(false)
      }),
      'Empleado registrado correctamente.',
    )
  }

  const crearPlanilla = (e) => {
    e.preventDefault()
    ejecutar(
      () => api.crearPlanilla({
        sucursalId,
        nombre: planilla.nombre,
        fechaInicio: planilla.fechaInicio,
        fechaFin: planilla.fechaFin,
        observaciones: planilla.observaciones || null,
      }).then(() => {
        setPlanilla(PLANILLA_VACIA)
        setModalPlanilla(false)
      }),
      'Planilla creada correctamente.',
    )
  }

  const verPlanilla = async (planillaId) => {
    setCargando(true)
    try {
      const data = await api.obtenerPlanilla(planillaId)
      setDetalle(data.planilla)
    } catch (error) {
      setMensaje({ color: 'danger', texto: error.message })
    } finally {
      setCargando(false)
    }
  }

  if (cargando && empleados.length === 0 && planillas.length === 0) {
    return <div className="text-center py-5"><Spinner /></div>
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <h2 className="fw-bold mb-0">Equipo y nómina</h2>
        <div className="d-flex gap-2">
          <Button color="secondary" outline onClick={cargar} disabled={enviando}>
            <i className="bi bi-arrow-clockwise me-1" />Actualizar
          </Button>
          {tab === 'empleados' ? (
            <Button color="primary" onClick={() => setModalEmpleado(true)}>
              <i className="bi bi-person-plus me-1" />Nuevo empleado
            </Button>
          ) : (
            <Button color="primary" onClick={() => setModalPlanilla(true)}>
              <i className="bi bi-plus-lg me-1" />Nueva planilla
            </Button>
          )}
        </div>
      </div>

      {mensaje && <Alert color={mensaje.color} toggle={() => setMensaje(null)}>{mensaje.texto}</Alert>}

      <Nav tabs className="mb-3">
        <NavItem><NavLink href="#" active={tab === 'empleados'}
          onClick={(e) => { e.preventDefault(); setTab('empleados'); setDetalle(null) }}>Empleados</NavLink></NavItem>
        <NavItem><NavLink href="#" active={tab === 'planillas'}
          onClick={(e) => { e.preventDefault(); setTab('planillas'); setDetalle(null) }}>Planillas</NavLink></NavItem>
      </Nav>

      {tab === 'empleados' && (
        <div className="table-responsive bg-white rounded shadow-sm">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light"><tr>
              <th>Empleado</th><th>Documento</th><th>Cargo</th>
              <th>Contratación</th><th className="text-end">Salario mensual</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {empleados.length === 0 && (
                <tr><td colSpan="6" className="text-center text-muted py-4">No hay empleados registrados.</td></tr>
              )}
              {empleados.map((e) => (
                <tr key={e.empleado_id}>
                  <td><strong>{e.nombre}</strong>{e.correo && <div className="small text-muted">{e.correo}</div>}</td>
                  <td>{e.documento}</td><td>{e.cargo}</td>
                  <td>{e.fecha_contratacion ? String(e.fecha_contratacion).slice(0, 10) : '-'}</td>
                  <td className="text-end">{money(e.salario_base)}</td>
                  <td><Badge color={e.activo ? 'success' : 'secondary'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {tab === 'planillas' && (
        <Row className="g-3">
          <Col lg={detalle ? 5 : 12}>
            <div className="table-responsive bg-white rounded shadow-sm">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light"><tr>
                  <th>Planilla</th><th>Período</th><th>Estado</th><th>Empleados</th><th />
                </tr></thead>
                <tbody>
                  {planillas.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted py-4">No hay planillas creadas.</td></tr>
                  )}
                  {planillas.map((p) => (
                    <tr key={p.planilla_id}>
                      <td><strong>{p.nombre}</strong></td>
                      <td>{String(p.fecha_inicio).slice(0, 10)} - {String(p.fecha_fin).slice(0, 10)}</td>
                      <td><Badge color={p.estado === 'PAGADA' ? 'success' : p.estado === 'PROCESADA' ? 'info' : 'warning'}>{p.estado}</Badge></td>
                      <td>{p.cantidad_empleados}</td>
                      <td className="text-end">
                        <Button size="sm" color="secondary" outline onClick={() => verPlanilla(p.planilla_id)}>Ver</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Col>

          {detalle && (
            <Col lg={7}>
              <Card><CardBody>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div><h5 className="mb-1">{detalle.nombre}</h5><div className="text-muted small">{detalle.sucursal}</div></div>
                  <Badge color={detalle.estado === 'PAGADA' ? 'success' : detalle.estado === 'PROCESADA' ? 'info' : 'warning'}>{detalle.estado}</Badge>
                </div>
                <div className="table-responsive">
                  <Table size="sm" className="align-middle">
                    <thead><tr><th>Empleado</th><th className="text-end">Base</th><th className="text-end">ISSS</th><th className="text-end">AFP</th><th className="text-end">ISR</th><th className="text-end">Neto</th><th /></tr></thead>
                    <tbody>
                      {detalle.detalles?.map((d) => (
                        <tr key={d.detalle_planilla_id}>
                          <td>{d.empleado}</td><td className="text-end">{money(d.salario_base)}</td>
                          <td className="text-end">{money(d.deduccion_isss)}</td><td className="text-end">{money(d.deduccion_afp)}</td>
                          <td className="text-end">{money(d.deduccion_isr)}</td><td className="text-end fw-bold">{money(d.salario_neto)}</td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              color="secondary"
                              outline
                              disabled={detalle.estado !== 'PAGADA'}
                              title={detalle.estado === 'PAGADA' ? 'Ver boleta' : 'Disponible cuando la planilla este pagada'}
                              aria-label={`Ver boleta de ${d.empleado}`}
                              onClick={() => setBoleta(d)}
                            >
                              <i className="bi bi-receipt me-1" />Boleta
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {detalle.estado === 'PENDIENTE' && (
                  <Button color="primary" className="me-2" disabled={enviando}
                    onClick={() => ejecutar(
                      () => api.generarDetallePlanilla(detalle.planilla_id).then(() => verPlanilla(detalle.planilla_id)),
                      'Detalle de nómina generado.',
                    )}>Generar detalle</Button>
                )}
                {detalle.estado === 'PENDIENTE' && detalle.detalles?.length > 0 && (
                  <Button color="success" disabled={enviando}
                    onClick={() => ejecutar(
                      () => api.procesarPlanilla(detalle.planilla_id).then(() => verPlanilla(detalle.planilla_id)),
                      'Planilla procesada.',
                    )}>Procesar</Button>
                )}
                {detalle.estado === 'PROCESADA' && (
                  <Button color="success" disabled={enviando}
                    onClick={() => ejecutar(
                      () => api.pagarPlanilla(detalle.planilla_id).then(() => verPlanilla(detalle.planilla_id)),
                      'Planilla marcada como pagada.',
                    )}>Marcar pagada</Button>
                )}
              </CardBody></Card>
            </Col>
          )}
        </Row>
      )}

      <Modal isOpen={modalEmpleado} toggle={() => setModalEmpleado(false)}>
        <Form onSubmit={guardarEmpleado}>
          <ModalHeader toggle={() => setModalEmpleado(false)}>Nuevo empleado</ModalHeader>
          <ModalBody>
            {[
              ['nombre', 'Nombre completo', 'text'],
              ['documento', 'Documento', 'text'],
              ['telefono', 'Teléfono', 'text'],
              ['correo', 'Correo', 'email'],
              ['cargo', 'Cargo', 'text'],
              ['fechaContratacion', 'Fecha de contratación', 'date'],
              ['salarioBase', 'Salario mensual', 'number'],
            ].map(([clave, etiqueta, tipo]) => (
              <FormGroup key={clave}><Label>{etiqueta}</Label>
                <Input type={tipo} required={!['telefono', 'correo'].includes(clave)}
                  min={tipo === 'number' ? '0' : undefined} step={tipo === 'number' ? '0.01' : undefined}
                  value={empleado[clave]} onChange={(e) => setEmpleado({ ...empleado, [clave]: e.target.value })} />
              </FormGroup>
            ))}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" type="button" onClick={() => setModalEmpleado(false)}>Cancelar</Button>
            <Button color="primary" type="submit" disabled={enviando}>Guardar</Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={modalPlanilla} toggle={() => setModalPlanilla(false)}>
        <Form onSubmit={crearPlanilla}>
          <ModalHeader toggle={() => setModalPlanilla(false)}>Nueva planilla</ModalHeader>
          <ModalBody>
            <FormGroup><Label>Nombre</Label>
              <Input required value={planilla.nombre}
                onChange={(e) => setPlanilla({ ...planilla, nombre: e.target.value })} />
            </FormGroup>
            <FormGroup><Label>Fecha inicial</Label>
              <Input type="date" required value={planilla.fechaInicio}
                onChange={(e) => setPlanilla({ ...planilla, fechaInicio: e.target.value })} />
            </FormGroup>
            <FormGroup><Label>Fecha final</Label>
              <Input type="date" required value={planilla.fechaFin}
                onChange={(e) => setPlanilla({ ...planilla, fechaFin: e.target.value })} />
            </FormGroup>
            <FormGroup><Label>Observaciones</Label>
              <Input type="textarea" value={planilla.observaciones}
                onChange={(e) => setPlanilla({ ...planilla, observaciones: e.target.value })} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" type="button" onClick={() => setModalPlanilla(false)}>Cancelar</Button>
            <Button color="primary" type="submit" disabled={enviando}>Crear</Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={Boolean(boleta)} toggle={() => setBoleta(null)} centered>
        <ModalHeader className="no-print" toggle={() => setBoleta(null)}>
          Boleta de pago
        </ModalHeader>
        {boleta && (
          <>
            <ModalBody>
              <div className="comprobante boleta-nomina">
                <div className="text-center border-bottom pb-3 mb-3">
                  <h4 className="mb-1">Restaurante Orígenes SV</h4>
                  <div className="text-muted">{detalle.sucursal}</div>
                  <strong>Boleta de pago de nómina</strong>
                </div>
                <div className="small">
                  <div><strong>Empleado:</strong> {boleta.empleado}</div>
                  <div><strong>Planilla:</strong> {detalle.nombre}</div>
                  <div>
                    <strong>Período:</strong>{' '}
                    {String(detalle.fecha_inicio).slice(0, 10)} - {String(detalle.fecha_fin).slice(0, 10)}
                  </div>
                  <div><strong>Estado:</strong> {detalle.estado}</div>
                </div>
                <hr className="my-3" />
                <Table size="sm" borderless className="mb-0">
                  <tbody>
                    <tr>
                      <td>Salario base</td>
                      <td className="text-end">{money(boleta.salario_base)}</td>
                    </tr>
                    <tr>
                      <td>Bonificaciones</td>
                      <td className="text-end">{money(boleta.bonificaciones)}</td>
                    </tr>
                    <tr className="table-light fw-semibold">
                      <td>Total ingresos</td>
                      <td className="text-end">
                        {money(Number(boleta.salario_base || 0) + Number(boleta.bonificaciones || 0))}
                      </td>
                    </tr>
                  </tbody>
                </Table>
                <Table size="sm" borderless className="mb-0">
                  <tbody>
                    <tr>
                      <td>Deducción ISSS</td>
                      <td className="text-end">{money(boleta.deduccion_isss)}</td>
                    </tr>
                    <tr>
                      <td>Deducción AFP</td>
                      <td className="text-end">{money(boleta.deduccion_afp)}</td>
                    </tr>
                    <tr>
                      <td>Deducción ISR</td>
                      <td className="text-end">{money(boleta.deduccion_isr)}</td>
                    </tr>
                    <tr className="table-light fw-semibold">
                      <td>Total deducciones</td>
                      <td className="text-end">{money(boleta.deducciones)}</td>
                    </tr>
                    <tr className="border-top fw-bold fs-5">
                      <td>Salario neto</td>
                      <td className="text-end">{money(boleta.salario_neto)}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </ModalBody>
            <ModalFooter className="no-print">
              <Button color="secondary" outline onClick={() => setBoleta(null)}>
                Cerrar
              </Button>
              <Button color="primary" onClick={() => window.print()}>
                <i className="bi bi-printer me-1" />Imprimir boleta
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  )
}
