import { useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, FormGroup, Label, Input, Alert, Spinner,
} from 'reactstrap'
import { api } from '../../api/client'
import { fmtCantidad } from '../../utils/formatoInventario'

// Define el nivel a partir del cual el sistema muestra la alerta de "Stock bajo"
export default function ModalStockMinimo({ articulo, onClose, onGuardado }) {
  const [stockMinimo, setStockMinimo] = useState(String(Number(articulo.stock_minimo)))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    const minimo = Number(stockMinimo)

    if (stockMinimo === '' || Number.isNaN(minimo) || minimo < 0) {
      setError('Ingresa un número válido (0 o mayor).')
      return
    }

    setGuardando(true)
    setError('')
    try {
      await api.definirStockMinimo({
        tipo: articulo.tipo,
        articuloId: articulo.articulo_id,
        stockMinimo: minimo,
      })
      onGuardado(`Stock mínimo actualizado para ${articulo.nombre}.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen toggle={onClose} centered>
      <ModalHeader toggle={onClose}>Stock mínimo</ModalHeader>
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
          <Label for="minimo-valor">Avisar cuando quede esta cantidad o menos ({articulo.unidad})</Label>
          <Input
            id="minimo-valor"
            type="number"
            min="0"
            step="0.001"
            value={stockMinimo}
            onChange={(e) => setStockMinimo(e.target.value)}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <Button color="primary" onClick={guardar} disabled={guardando}>
          {guardando ? <Spinner size="sm" /> : 'Guardar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
