import { useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Badge, Table, Input, Label, Alert, Spinner,
} from 'reactstrap'
import { api } from '../../api/client'
import {
  fmtCantidad, fmtCosto, fmtFecha, fmtDia, ESTADO_COMPRA,
} from '../../utils/formatoInventario'

// Detalle de una compra. Si está PENDIENTE se puede recibir (entra al inventario y se
// genera la cuenta por pagar) o anular. Una compra ya recibida no se puede anular.
export default function ModalDetalleCompra({ compra, onClose, onCambio }) {
  // null = solo lectura, 'recibir' o 'anular' = esperando confirmación
  const [accion, setAccion] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const pendiente = compra.estado === 'PENDIENTE'
  const estado = ESTADO_COMPRA[compra.estado] || ESTADO_COMPRA.PENDIENTE
  const cuenta = compra.cuenta_por_pagar

  const recibir = async () => {
    setProcesando(true)
    setError('')
    try {
      await api.recibirCompra(compra.compra_id)
      onCambio(
        `Compra ${compra.numero_documento} recibida: el inventario se actualizó y se generó la cuenta por pagar.`,
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(false)
    }
  }

  const anular = async () => {
    if (motivo.trim().length < 5 || motivo.trim().length > 200) {
      setError('El motivo es obligatorio (5 a 200 caracteres).')
      return
    }
    setProcesando(true)
    setError('')
    try {
      await api.anularCompra(compra.compra_id, motivo.trim())
      onCambio(`Compra ${compra.numero_documento} anulada.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(false)
    }
  }

  const volver = () => {
    setAccion(null)
    setMotivo('')
    setError('')
  }

  return (
    <Modal isOpen toggle={onClose} centered size="lg" scrollable>
      <ModalHeader toggle={onClose}>Compra {compra.numero_documento}</ModalHeader>
      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}

        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <div>
            <div className="fw-semibold">{compra.proveedor}</div>
            <div className="small text-muted">
              Registrada el {fmtFecha(compra.fecha_compra)} por {compra.usuario}
            </div>
            {compra.fecha_recepcion && (
              <div className="small text-muted">Recibida el {fmtFecha(compra.fecha_recepcion)}</div>
            )}
          </div>
          <div className="text-end">
            <Badge color={estado.color}>{estado.texto}</Badge>
            <div className="small text-muted mt-1">
              {compra.dias_credito > 0 ? `Crédito de ${compra.dias_credito} días` : 'Pago al contado'}
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <Table size="sm" className="align-middle">
            <thead className="table-light">
              <tr>
                <th>Artículo</th>
                <th className="text-end">Cantidad</th>
                <th className="text-end">Costo unitario</th>
                <th className="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {compra.detalles.map((d) => (
                <tr key={d.detalle_compra_id}>
                  <td>
                    {d.articulo}
                    <div className="small text-muted">
                      {d.tipo === 'INGREDIENTE' ? 'Ingrediente' : 'Reventa'}
                    </div>
                  </td>
                  <td className="text-end">{fmtCantidad(d.cantidad)}</td>
                  <td className="text-end">{fmtCosto(d.costo_unitario)}</td>
                  <td className="text-end">{fmtCosto(d.subtotal_linea)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        <div className="border-top pt-2 ms-auto" style={{ maxWidth: 280 }}>
          <div className="d-flex justify-content-between">
            <span>Subtotal</span>
            <span>{fmtCosto(compra.subtotal)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>IVA {Number(compra.porcentaje_iva)}%</span>
            <span>{fmtCosto(compra.iva)}</span>
          </div>
          <div className="d-flex justify-content-between fs-5 fw-bold">
            <span>Total</span>
            <span>{fmtCosto(compra.total)}</span>
          </div>
        </div>

        {cuenta && (
          <Alert color="light" className="border mt-3 mb-0">
            <strong>Cuenta por pagar:</strong> saldo {fmtCosto(cuenta.saldo)} de{' '}
            {fmtCosto(cuenta.monto_total)} · vence el {fmtDia(cuenta.fecha_vencimiento)} ·{' '}
            {cuenta.estado}
          </Alert>
        )}

        {compra.observaciones && (
          <div className="mt-3">
            <div className="fw-semibold">Observaciones</div>
            <div className="text-muted">{compra.observaciones}</div>
          </div>
        )}

        {accion === 'recibir' && (
          <Alert color="info" className="mt-3 mb-0">
            Al recibir la compra, el stock de cada artículo aumenta, se actualiza su último costo
            y se genera la cuenta por pagar
            {compra.dias_credito > 0
              ? ` con vencimiento a ${compra.dias_credito} días`
              : ' con vencimiento hoy'}
            . Esta acción no se puede deshacer. ¿Confirmas?
          </Alert>
        )}

        {accion === 'anular' && (
          <div className="mt-3">
            <Label for="anular-motivo">Motivo de la anulación</Label>
            <Input
              id="anular-motivo"
              maxLength={200}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. el proveedor canceló el pedido"
            />
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {accion === null && (
          <>
            <Button color="outline-secondary" onClick={onClose}>
              Cerrar
            </Button>
            {pendiente && (
              <>
                <Button color="outline-secondary" onClick={() => setAccion('anular')}>
                  Anular
                </Button>
                <Button color="warning" onClick={() => setAccion('recibir')}>
                  Recibir compra
                </Button>
              </>
            )}
          </>
        )}

        {accion === 'recibir' && (
          <>
            <Button color="outline-secondary" onClick={volver} disabled={procesando}>
              Volver
            </Button>
            <Button color="warning" onClick={recibir} disabled={procesando}>
              {procesando ? <Spinner size="sm" /> : 'Confirmar recepción'}
            </Button>
          </>
        )}

        {accion === 'anular' && (
          <>
            <Button color="outline-secondary" onClick={volver} disabled={procesando}>
              Volver
            </Button>
            <Button color="warning" onClick={anular} disabled={procesando}>
              {procesando ? <Spinner size="sm" /> : 'Confirmar anulación'}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
