import { useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, FormGroup, Label, Input, Alert, Spinner,
} from 'reactstrap'
import { api } from '../../api/client'

// Sirve para crear (ingrediente = null) y para editar un ingrediente existente.
// Al editar, el backend solo permite cambiar nombre, descripción y si está activo.
export default function ModalIngrediente({ ingrediente, unidades, onClose, onGuardado }) {
  const esEdicion = Boolean(ingrediente)

  const [codigo, setCodigo] = useState(ingrediente?.codigo || '')
  const [nombre, setNombre] = useState(ingrediente?.nombre || '')
  const [unidadId, setUnidadId] = useState(ingrediente ? String(ingrediente.unidad_id) : '')
  const [descripcion, setDescripcion] = useState(ingrediente?.descripcion || '')
  const [activo, setActivo] = useState(ingrediente ? ingrediente.activo : true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (nombre.trim().length < 2 || nombre.trim().length > 150) {
      setError('El nombre debe tener entre 2 y 150 caracteres.')
      return
    }
    if (!esEdicion && !/^[A-Za-z0-9-]{2,30}$/.test(codigo.trim())) {
      setError('El código debe tener 2 a 30 caracteres (letras, números o guion, sin espacios).')
      return
    }
    if (!esEdicion && !unidadId) {
      setError('Selecciona la unidad de medida.')
      return
    }

    setGuardando(true)
    setError('')
    try {
      if (esEdicion) {
        await api.actualizarIngrediente(ingrediente.ingrediente_id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          activo,
        })
        onGuardado(`Ingrediente "${nombre.trim()}" actualizado.`)
      } else {
        await api.crearIngrediente({
          codigo: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          unidadId: Number(unidadId),
          descripcion: descripcion.trim() || undefined,
        })
        onGuardado(`Ingrediente "${nombre.trim()}" creado.`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen toggle={onClose} centered>
      <ModalHeader toggle={onClose}>
        {esEdicion ? 'Editar ingrediente' : 'Nuevo ingrediente'}
      </ModalHeader>
      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}

        <FormGroup>
          <Label for="ing-codigo">Código</Label>
          <Input
            id="ing-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej. CAFE-ESP"
            disabled={esEdicion}
          />
        </FormGroup>

        <FormGroup>
          <Label for="ing-nombre">Nombre</Label>
          <Input
            id="ing-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Café de especialidad"
          />
        </FormGroup>

        <FormGroup>
          <Label for="ing-unidad">Unidad de medida</Label>
          <Input
            id="ing-unidad"
            type="select"
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            disabled={esEdicion}
          >
            <option value="">Selecciona una unidad</option>
            {unidades.map((u) => (
              <option key={u.unidad_id} value={u.unidad_id}>
                {u.nombre} ({u.abreviatura})
              </option>
            ))}
          </Input>
        </FormGroup>

        <FormGroup>
          <Label for="ing-desc">Descripción (opcional)</Label>
          <Input
            id="ing-desc"
            type="textarea"
            rows="2"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </FormGroup>

        {esEdicion && (
          <FormGroup check>
            <Input
              id="ing-activo"
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            <Label for="ing-activo" check>
              Ingrediente activo
            </Label>
          </FormGroup>
        )}
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
