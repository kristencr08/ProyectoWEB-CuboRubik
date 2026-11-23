import { useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Badge, Table, Input, Label, Alert, Spinner, Row, Col, InputGroup, InputGroupText,
} from 'reactstrap'
import { api } from '../../api/client'
import {
  fmtCosto, fmtFecha, fmtDia, ESTADO_CXP, METODOS_PAGO_PROVEEDOR,
} from '../../utils/formatoInventario'

// Detalle de una cuenta por pagar: historial de pagos y formulario para abonar.
// Se pueden registrar varios pagos seguidos: el modal se queda abierto y se actualiza solo.
export default function ModalCuenta({ cuenta: cuentaInicial, onClose, onActualizado }) {
  const [cuenta, setCuenta] = useState(cuentaInicial)
  const saldo = Number(cuenta.saldo)
  const total = Number(cuenta.monto_total)
  const pagada = cuenta.estado === 'PAGADA'
  const estado = ESTADO_CXP[cuenta.estado] || ESTADO_CXP.PENDIENTE

  const [monto, setMonto] = useState(saldo.toFixed(2))
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [referencia, setReferencia] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const pagar = async () => {
    const valor = Number(monto)
    const centavos = Math.round(valor * 100)

    if (monto === '' || !(valor > 0) || Math.abs(valor * 100 - centavos) > 1e-6) {
      setError('El monto debe ser mayor que 0 (máximo 2 decimales).')
      return
    }
    if (centavos > Math.round(saldo * 100)) {
      setError(`El monto excede el saldo pendiente (${fmtCosto(saldo)}).`)
      return
    }

    setProcesando(true)
    setError('')
    setMensaje('')
    try {
      await api.registrarPagoProveedor(cuenta.cxp_id, {
        monto: valor,
        metodoPago: metodo,
        referencia: referencia.trim() || undefined,
      })
      // Se vuelve a pedir la cuenta para ver el nuevo saldo y el pago en el historial
      const data = await api.cuentaPorPagar(cuenta.cxp_id)
      setCuenta(data.cuenta)
      setMonto(Number(data.cuenta.saldo).toFixed(2))
      setReferencia('')
      setMensaje('Pago registrado correctamente.')
      onActualizado() // refresca la lista y el resumen de la pantalla
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Modal isOpen toggle={onClose} centered size="lg" scrollable>
      <ModalHeader toggle={onClose}>Cuenta de la compra {cuenta.numero_documento}</ModalHeader>
      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}
        {mensaje && <Alert color="success">{mensaje}</Alert>}

        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <div>
            <div className="fw-semibold">{cuenta.proveedor}</div>
            <div className="small text-muted">Emitida el {fmtDia(cuenta.fecha_emision)}</div>
            <div className="small text-muted">Vence el {fmtDia(cuenta.fecha_vencimiento)}</div>
          </div>
          <div className="text-end">
            <Badge color={estado.color}>{estado.texto}</Badge>
            {cuenta.vencida && (
              <Badge color="danger" className="ms-1">
                Vencida
              </Badge>
            )}
          </div>
        </div>

        <Row className="text-center g-2 mb-3">
          <Col xs={4}>
            <div className="text-muted small">Monto total</div>
            <div className="fs-5">{fmtCosto(total)}</div>
          </Col>
          <Col xs={4}>
            <div className="text-muted small">Pagado</div>
            <div className="fs-5 text-success">{fmtCosto(total - saldo)}</div>
          </Col>
          <Col xs={4}>
            <div className="text-muted small">Saldo</div>
            <div className={`fs-5 fw-bold ${saldo > 0 && cuenta.vencida ? 'text-danger' : ''}`}>
              {fmtCosto(saldo)}
            </div>
          </Col>
        </Row>

        <div className="fw-semibold mb-1">Pagos realizados</div>
        <div className="table-responsive mb-3">
          <Table size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Registró</th>
                <th className="text-end">Monto</th>
              </tr>
            </thead>
            <tbody>
              {cuenta.pagos.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-3">
                    Aún no hay pagos registrados.
                  </td>
                </tr>
              )}
              {cuenta.pagos.map((p) => (
                <tr key={p.pago_id}>
                  <td className="text-nowrap">{fmtFecha(p.fecha)}</td>
                  <td>{METODOS_PAGO_PROVEEDOR[p.metodo_pago] || p.metodo_pago}</td>
                  <td>{p.referencia || '—'}</td>
                  <td>{p.usuario}</td>
                  <td className="text-end">{fmtCosto(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {!pagada && (
          <div className="border-top pt-3">
            <div className="fw-semibold mb-2">Registrar pago</div>
            <Row className="g-2">
              <Col md={4}>
                <Label for="pago-monto" className="small mb-1">Monto</Label>
                <InputGroup>
                  <InputGroupText>$</InputGroupText>
                  <Input
                    id="pago-monto"
                    type="number"
                    min="0"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                  />
                </InputGroup>
                <Button
                  color="link"
                  size="sm"
                  className="p-0"
                  onClick={() => setMonto(saldo.toFixed(2))}
                >
                  Pagar el saldo completo
                </Button>
              </Col>
              <Col md={4}>
                <Label for="pago-metodo" className="small mb-1">Método de pago</Label>
                <Input
                  id="pago-metodo"
                  type="select"
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                >
                  {Object.entries(METODOS_PAGO_PROVEEDOR).map(([clave, texto]) => (
                    <option key={clave} value={clave}>
                      {texto}
                    </option>
                  ))}
                </Input>
              </Col>
              <Col md={4}>
                <Label for="pago-ref" className="small mb-1">Referencia (opcional)</Label>
                <Input
                  id="pago-ref"
                  maxLength={100}
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="N.º de transferencia o cheque"
                />
              </Col>
            </Row>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="outline-secondary" onClick={onClose} disabled={procesando}>
          Cerrar
        </Button>
        {!pagada && (
          <Button color="warning" onClick={pagar} disabled={procesando}>
            {procesando ? <Spinner size="sm" /> : 'Registrar pago'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
