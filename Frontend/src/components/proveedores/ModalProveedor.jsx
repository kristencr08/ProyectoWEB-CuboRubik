import { useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, FormGroup, Label, Input, Alert, Spinner,
} from 'reactstrap'
import { api } from '../../api/client'

// Sirve para crear (proveedor = null) y para editar un proveedor existente.
export default function ModalProveedor({ proveedor, onClose, onGuardado }) {
  const esEdicion = Boolean(proveedor)

  const [nombre, setNombre] = useState(proveedor?.nombre || '')
  const [documento, setDocumento] = useState(proveedor?.documento || '')
  const [telefono, setTelefono] = useState(proveedor?.telefono || '')
  const [correo, setCorreo] = useState(proveedor?.correo || '')
  const [direccion, setDireccion] = useState(proveedor?.direccion || '')
  const [activo, setActivo] = useState(proveedor ? proveedor.activo : true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (nombre.trim().length < 2 || nombre.trim().length > 150) {
      setError('El nombre debe tener entre 2 y 150 caracteres.')
      return
    }
    if (correo.trim() && !/^\S+@\S+\.\S+$/.test(correo.trim())) {
      setError('El correo no tiene un formato válido.')
      return
    }

    // Los campos vacíos no se envían (JSON.stringify ignora los undefined).
    // El backend actualiza con COALESCE, así que un campo no enviado conserva su valor.
    const datos = {
      nombre: nombre.trim(),
      documento: documento.trim() || undefined,
      telefono: telefono.trim() || undefined,
      correo: correo.trim() || undefined,
      direccion: direccion.trim() || undefined,
    }

    setGuardando(true)
    setError('')
    try {
      if (esEdicion) {
        await api.actualizarProveedor(proveedor.proveedor_id, { ...datos, activo })
        onGuardado(`Proveedor "${datos.nombre}" actualizado.`)
      } else {
        await api.crearProveedor(datos)
        onGuardado(`Proveedor "${datos.nombre}" creado.`)
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
        {esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
      </ModalHeader>
      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}

        <FormGroup>
          <Label for="prov-nombre">Nombre</Label>
          <Input
            id="prov-nombre"
            maxLength={150}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Distribuidora La Esperanza"
          />
        </FormGroup>

        <FormGroup>
          <Label for="prov-doc">Documento (NIT, DUI o NRC)</Label>
          <Input
            id="prov-doc"
            maxLength={30}
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label for="prov-tel">Teléfono</Label>
          <Input
            id="prov-tel"
            maxLength={20}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. 2222-3333"
          />
        </FormGroup>

        <FormGroup>
          <Label for="prov-correo">Correo</Label>
          <Input
            id="prov-correo"
            maxLength={150}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label for="prov-dir">Dirección</Label>
          <Input
            id="prov-dir"
            type="textarea"
            rows="2"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </FormGroup>

        {esEdicion && (
          <FormGroup check>
            <Input
              id="prov-activo"
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            <Label for="prov-activo" check>
              Proveedor activo
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
