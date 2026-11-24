import { useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, FormGroup, Label, Input, Alert, Spinner,
} from 'reactstrap'
import { api } from '../../api/client'
import { fmtCantidad } from '../../utils/formatoInventario'

// Ajuste manual de stock (merma, conteo físico, etc.)
// El backend deja la existencia en "nuevaCantidad" y guarda un movimiento tipo AJUSTE.
export default function ModalAjuste({ articulo, onClose, onGuardado }) {
  const [nuevaCantidad, setNuevaCantidad] = useState(String(Number(articulo.stock)))
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const diferencia = Number(nuevaCantidad) - Number(articulo.stock)

  const guardar = async () => {
    const cantidad = Number(nuevaCantidad)

    if (nuevaCantidad === '' || Number.isNaN(cantidad) || cantidad < 0) {
      setError('Ingresa una cantidad válida (0 o mayor).')
      return
    }
    if (motivo.trim().length < 5 || motivo.trim().length > 200) {
      setError('El motivo es obligatorio (5 a 200 caracteres).')
      return
    }

    setGuardando(true)
    setError('')
    try {
      await api.registrarAjuste({
        tipo: articulo.tipo,
        articuloId: articulo.articulo_id,
        nuevaCantidad: cantidad,
        motivo: motivo.trim(),
      })
      onGuardado(`Ajuste registrado para ${articulo.nombre}.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen toggle={onClose} centered>
      <ModalHeader toggle={onClose}>Ajustar stock</ModalHeader>
      <ModalBody>
        <p className="mb-3">
          <strong>{articulo.nombre}</strong>
          <br />
          <span className="text-muted">
            Existencia actual: {fmtCantidad(articulo.stock)} {articulo.unidad}
          </span>
        </p>

        {error && <Alert color="danger">{error}</Alert>}

        <FormGroup>
          <Label for="ajuste-cantidad">Cantidad real ({articulo.unidad})</Label>
          <Input
            id="ajuste-cantidad"
            type="number"
            min="0"
            step="0.001"
            value={nuevaCantidad}
            onChange={(e) => setNuevaCantidad(e.target.value)}
          />
          {nuevaCantidad !== '' && !Number.isNaN(diferencia) && diferencia !== 0 && (
            <small className={diferencia > 0 ? 'text-success' : 'text-danger'}>
              Diferencia: {diferencia > 0 ? '+' : ''}
              {fmtCantidad(diferencia)} {articulo.unidad}
            </small>
          )}
        </FormGroup>

        <FormGroup>
          <Label for="ajuste-motivo">Motivo</Label>
          <Input
            id="ajuste-motivo"
            type="text"
            placeholder="Ej. conteo físico, producto vencido"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <Button color="primary" onClick={guardar} disabled={guardando}>
          {guardando ? <Spinner size="sm" /> : 'Guardar ajuste'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
