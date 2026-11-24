import { useEffect, useState } from 'react'
import {
  Alert, Badge, Button, Card, CardBody, Col, Form, FormGroup, Input,
  Label, Row, Spinner, Table,
} from 'reactstrap'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { money } from '../utils/formato'

const ES_GESTION = ['ADMINISTRADOR', 'GERENTE']

export default function Caja() {
  const { user } = useAuth()
  const puedeGestionar = ES_GESTION.includes(String(user?.rol).toUpperCase())

  const [contexto, setContexto] = useState(null)
  const [turnoActual, setTurnoActual] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [apertura, setApertura] = useState({
    cajeroId: '', turno: 'MATUTINO', montoInicial: '100',
  })
  const [movimiento, setMovimiento] = useState({
    turnoId: '', tipo: 'INGRESO', monto: '', descripcion: '',
  })
  const [cierre, setCierre] = useState({
    turnoId: '', efectivoContado: '', tarjetaContada: '',
    bitcoinContado: '', chivoWalletContado: '',
  })

  const cargar = async () => {
    setCargando(true)
    setMensaje(null)
    try {
      const [datos, actual] = await Promise.all([api.contextoCaja(), api.turnoActual()])
      setContexto(datos)
      setTurnoActual(actual)
      if (datos.cajeros.length && !apertura.cajeroId) {
        setApertura((prev) => ({ ...prev, cajeroId: String(datos.cajeros[0].usuario_id) }))
      }
      if (actual.turno_id) setMovimiento((prev) => ({ ...prev, turnoId: String(actual.turno_id) }))
    } catch (error) {
      setMensaje({ color: 'danger', texto: error.message })
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

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

  const abrir = (e) => {
    e.preventDefault()
    ejecutar(
      () => api.abrirCaja({
        cajaId: Number(contexto.caja.caja_id),
        cajeroId: Number(apertura.cajeroId),
        turno: apertura.turno,
        montoInicial: Number(apertura.montoInicial),
      }),
      'Caja abierta y cajero asignado.',
    )
  }

  const registrarMovimiento = (e) => {
    e.preventDefault()
    ejecutar(
      () => api.movimientoCaja(Number(movimiento.turnoId), {
        tipo: movimiento.tipo,
        monto: Number(movimiento.monto),
        descripcion: movimiento.descripcion,
      }),
      'Movimiento de caja registrado.',
    )
  }

  const solicitarCierre = (e) => {
    e.preventDefault()
    ejecutar(
      () => api.solicitarCierreCaja(Number(cierre.turnoId), {
        efectivoContado: Number(cierre.efectivoContado),
        tarjetaContada: Number(cierre.tarjetaContada),
        bitcoinContado: Number(cierre.bitcoinContado),
        chivoWalletContado: Number(cierre.chivoWalletContado),
      }),
      'Solicitud de cierre enviada al gerente.',
    )
  }

  if (cargando) return <div className="text-center py-5"><Spinner /></div>

  const abiertos = contexto?.turnos?.filter((t) => t.estado === 'ABIERTO') || []
  const pendientes = contexto?.turnos?.filter((t) => t.estado === 'PENDIENTE_CIERRE') || []

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <h2 className="fw-bold mb-0">Caja y turnos</h2>
        <Button color="secondary" outline onClick={cargar} disabled={enviando}>
          <i className="bi bi-arrow-clockwise me-1" />Actualizar
        </Button>
      </div>

      {mensaje && <Alert color={mensaje.color} toggle={() => setMensaje(null)}>{mensaje.texto}</Alert>}

      <Row className="g-3 mb-3">
        <Col md={4}>
          <Card><CardBody>
            <div className="text-muted small">Caja</div>
            <div className="fw-semibold">{contexto?.caja?.nombre || 'Sin caja registrada'}</div>
          </CardBody></Card>
        </Col>
        <Col md={4}>
          <Card><CardBody>
            <div className="text-muted small">Turnos abiertos</div>
            <div className="fs-4">{abiertos.length}</div>
          </CardBody></Card>
        </Col>
        <Col md={4}>
          <Card><CardBody>
            <div className="text-muted small">Pendientes de cierre</div>
            <div className="fs-4 text-warning">{pendientes.length}</div>
          </CardBody></Card>
        </Col>
      </Row>

      {puedeGestionar && (
        <Row className="g-3 mb-3">
          <Col lg={5}>
            <Card className="h-100"><CardBody>
              <h5>Abrir caja</h5>
              <Form onSubmit={abrir}>
                <FormGroup>
                  <Label>Cajero asignado</Label>
                  <Input type="select" value={apertura.cajeroId}
                    onChange={(e) => setApertura({ ...apertura, cajeroId: e.target.value })}>
                    {contexto?.cajeros?.map((c) => (
                      <option key={c.usuario_id} value={c.usuario_id}>{c.nombre}</option>
                    ))}
                  </Input>
                </FormGroup>
                <FormGroup>
                  <Label>Turno</Label>
                  <Input type="select" value={apertura.turno}
                    onChange={(e) => setApertura({ ...apertura, turno: e.target.value })}>
                    <option value="MATUTINO">Matutino</option>
                    <option value="VESPERTINO">Vespertino</option>
                  </Input>
                </FormGroup>
                <FormGroup>
                  <Label>Monto inicial</Label>
                  <Input type="number" min="0" step="0.01" value={apertura.montoInicial}
                    onChange={(e) => setApertura({ ...apertura, montoInicial: e.target.value })} />
                </FormGroup>
                <Button color="primary" type="submit" disabled={!contexto?.caja || !contexto?.cajeros?.length || abiertos.length > 0 || enviando}>
                  Abrir turno
                </Button>
              </Form>
            </CardBody></Card>
          </Col>

          <Col lg={7}>
            <Card className="h-100"><CardBody>
              <h5>Solicitudes pendientes</h5>
              {pendientes.length === 0 ? (
                <div className="text-muted">No hay cierres pendientes.</div>
              ) : (
                <div className="table-responsive">
                  <Table size="sm" className="align-middle">
                    <thead><tr><th>Cajero</th><th>Efectivo</th><th>Tarjeta</th><th /></tr></thead>
                    <tbody>{pendientes.map((t) => (
                      <tr key={t.turno_id}>
                        <td>{t.cajero || 'Sin asignar'}</td>
                        <td>{money(t.efectivo_contado)}</td>
                        <td>{money(t.tarjeta_contada)}</td>
                        <td className="text-end">
                          <Button size="sm" color="success" disabled={enviando}
                            onClick={() => ejecutar(
                              () => api.autorizarCierreCaja(t.turno_id),
                              'Cierre autorizado y caja cerrada.',
                            )}>Autorizar</Button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </Table>
                </div>
              )}
            </CardBody></Card>
          </Col>
        </Row>
      )}

      <Row className="g-3">
        <Col lg={6}>
          <Card><CardBody>
            <h5>Registrar movimiento</h5>
            <Form onSubmit={registrarMovimiento}>
              <FormGroup>
                <Label>Turno abierto</Label>
                <Input type="select" value={movimiento.turnoId}
                  onChange={(e) => setMovimiento({ ...movimiento, turnoId: e.target.value })}>
                  {!abiertos.length && <option value="">Sin turnos abiertos</option>}
                  {abiertos.map((t) => (
                    <option key={t.turno_id} value={t.turno_id}>
                      {t.tipo_turno || 'Turno'} - {t.cajero || 'Cajero'}
                    </option>
                  ))}
                </Input>
              </FormGroup>
              <Row>
                <Col sm={5}><FormGroup><Label>Tipo</Label>
                  <Input type="select" value={movimiento.tipo}
                    onChange={(e) => setMovimiento({ ...movimiento, tipo: e.target.value })}>
                    <option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option>
                  </Input>
                </FormGroup></Col>
                <Col sm={7}><FormGroup><Label>Monto</Label>
                  <Input type="number" min="0.01" step="0.01" value={movimiento.monto}
                    onChange={(e) => setMovimiento({ ...movimiento, monto: e.target.value })} />
                </FormGroup></Col>
              </Row>
              <FormGroup><Label>Descripción</Label>
                <Input value={movimiento.descripcion}
                  onChange={(e) => setMovimiento({ ...movimiento, descripcion: e.target.value })} />
              </FormGroup>
              <Button color="primary" type="submit" disabled={!movimiento.turnoId || !movimiento.monto || enviando}>
                Registrar
              </Button>
            </Form>
          </CardBody></Card>
        </Col>

        <Col lg={6}>
          <Card><CardBody>
            <h5>Solicitar cierre</h5>
            <Form onSubmit={solicitarCierre}>
              <FormGroup><Label>Turno abierto</Label>
                <Input type="select" value={cierre.turnoId}
                  onChange={(e) => setCierre({ ...cierre, turnoId: e.target.value })}>
                  <option value="">Seleccione un turno</option>
                  {abiertos.map((t) => (
                    <option key={t.turno_id} value={t.turno_id}>
                      {t.tipo_turno || 'Turno'} - {t.cajero || 'Cajero'}
                    </option>
                  ))}
                </Input>
              </FormGroup>
              {[
                ['efectivoContado', 'Efectivo contado'],
                ['tarjetaContada', 'Tarjeta contada'],
                ['bitcoinContado', 'Bitcoin contado'],
                ['chivoWalletContado', 'Chivo Wallet contado'],
              ].map(([clave, etiqueta]) => (
                <FormGroup key={clave}><Label>{etiqueta}</Label>
                  <Input type="number" min="0" step="0.01" value={cierre[clave]}
                    onChange={(e) => setCierre({ ...cierre, [clave]: e.target.value })} />
                </FormGroup>
              ))}
              <Button color="warning" type="submit" disabled={!cierre.turnoId || enviando}>
                Solicitar cierre
              </Button>
            </Form>
          </CardBody></Card>
        </Col>
      </Row>

      {turnoActual?.abierto && (
        <div className="mt-3 text-muted small">
          Tu turno actual: <Badge color="success">ABIERTO</Badge> #{turnoActual.turno_id}
        </div>
      )}
    </div>
  )
}
