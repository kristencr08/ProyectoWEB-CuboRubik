import { useMemo, useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, FormGroup, Label, Input, InputGroup, InputGroupText, Alert, Spinner, Row, Col,
} from 'reactstrap'
import { api } from '../../api/client'
import { fmtCosto } from '../../utils/formatoInventario'

// Cada línea de la receta es un objeto { clave, ingredienteId, cantidad }.
// "clave" solo sirve para que React identifique la línea al agregar o quitar.
const nuevaLinea = (ingredienteId = '', cantidad = '') => ({
  clave: `${Date.now()}-${Math.random()}`,
  ingredienteId,
  cantidad,
})

// El backend acepta como máximo 3 decimales en las cantidades
const maxTresDecimales = (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6

// Crea la receta de un producto o reemplaza la que ya tiene (PUT /api/recetas/:productoId).
export default function ModalReceta({ producto, ingredientes, onClose, onGuardado }) {
  const tieneReceta = producto.receta_id !== null

  const [nombre, setNombre] = useState(producto.receta || '')
  const [cantidadProducida, setCantidadProducida] = useState(
    tieneReceta ? String(Number(producto.cantidad_producida)) : '1',
  )
  const [instrucciones, setInstrucciones] = useState(producto.instrucciones || '')
  const [lineas, setLineas] = useState(() =>
    tieneReceta && producto.ingredientes.length > 0
      ? producto.ingredientes.map((i) =>
          nuevaLinea(String(i.ingrediente_id), String(Number(i.cantidad))),
        )
      : [nuevaLinea()],
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Ingredientes activos + los que ya tiene la receta (por si alguno quedó inactivo)
  const catalogo = useMemo(() => {
    const lista = ingredientes.map((i) => ({
      id: String(i.ingrediente_id),
      nombre: i.nombre,
      unidad: i.unidad,
      costo: Number(i.ultimo_costo || 0),
      inactivo: false,
    }))
    producto.ingredientes.forEach((i) => {
      if (!lista.some((x) => x.id === String(i.ingrediente_id))) {
        lista.push({
          id: String(i.ingrediente_id),
          nombre: i.nombre,
          unidad: i.unidad,
          costo: 0,
          inactivo: true,
        })
      }
    })
    return lista
  }, [ingredientes, producto])

  const buscar = (id) => catalogo.find((c) => c.id === id)

  // Costo estimado por unidad con el último costo de cada ingrediente
  const costoEstimado = useMemo(() => {
    const producida = Number(cantidadProducida)
    if (!producida || producida <= 0) return null
    const total = lineas.reduce(
      (suma, l) => suma + Number(l.cantidad || 0) * (buscar(l.ingredienteId)?.costo || 0),
      0,
    )
    return total / producida
  }, [lineas, cantidadProducida, catalogo])

  const cambiarLinea = (clave, campo, valor) =>
    setLineas(lineas.map((l) => (l.clave === clave ? { ...l, [campo]: valor } : l)))

  const quitarLinea = (clave) => setLineas(lineas.filter((l) => l.clave !== clave))

  const validar = () => {
    if (nombre.trim() && (nombre.trim().length < 2 || nombre.trim().length > 150)) {
      return 'El nombre de la receta debe tener entre 2 y 150 caracteres.'
    }
    const producida = Number(cantidadProducida)
    if (cantidadProducida === '' || !(producida > 0) || !maxTresDecimales(producida)) {
      return 'Las unidades que rinde la receta deben ser mayores que 0 (máximo 3 decimales).'
    }
    if (lineas.length === 0) return 'La receta debe tener al menos un ingrediente.'
    if (lineas.length > 50) return 'La receta no puede tener más de 50 ingredientes.'

    const vistos = new Set()
    for (let i = 0; i < lineas.length; i += 1) {
      const { ingredienteId, cantidad } = lineas[i]
      const numero = i + 1
      if (!ingredienteId) return `Ingrediente ${numero}: selecciona un ingrediente.`
      if (vistos.has(ingredienteId)) return `Ingrediente ${numero}: está repetido en la receta.`
      vistos.add(ingredienteId)
      const valor = Number(cantidad)
      if (cantidad === '' || !(valor > 0) || !maxTresDecimales(valor)) {
        return `Ingrediente ${numero}: la cantidad debe ser mayor que 0 (máximo 3 decimales).`
      }
    }
    return ''
  }

  const guardar = async () => {
    const mensajeError = validar()
    if (mensajeError) {
      setError(mensajeError)
      return
    }

    setGuardando(true)
    setError('')
    try {
      await api.guardarReceta(producto.producto_id, {
        nombre: nombre.trim() || undefined, // sin nombre, el backend usa "Receta <producto>"
        cantidadProducida: Number(cantidadProducida),
        instrucciones: instrucciones.trim() || null,
        ingredientes: lineas.map((l) => ({
          ingredienteId: Number(l.ingredienteId),
          cantidad: Number(l.cantidad),
        })),
      })
      onGuardado(`Receta de "${producto.producto}" guardada.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen toggle={onClose} centered size="lg" scrollable>
      <ModalHeader toggle={onClose}>
        {tieneReceta ? 'Editar receta' : 'Nueva receta'}: {producto.producto}
      </ModalHeader>
      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}

        <Row className="g-3 mb-2">
          <Col md={8}>
            <Label for="rec-nombre">Nombre de la receta (opcional)</Label>
            <Input
              id="rec-nombre"
              maxLength={150}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={`Receta ${producto.producto}`}
            />
          </Col>
          <Col md={4}>
            <Label for="rec-producida">Unidades que rinde</Label>
            <Input
              id="rec-producida"
              type="number"
              min="0"
              step="0.001"
              value={cantidadProducida}
              onChange={(e) => setCantidadProducida(e.target.value)}
            />
          </Col>
        </Row>

        <Label className="mt-2">Ingredientes (cantidad para toda la receta)</Label>
        {lineas.map((linea) => {
          const elegido = buscar(linea.ingredienteId)
          return (
            <div key={linea.clave} className="d-flex gap-2 mb-2 align-items-start">
              <Input
                type="select"
                value={linea.ingredienteId}
                onChange={(e) => cambiarLinea(linea.clave, 'ingredienteId', e.target.value)}
              >
                <option value="">Selecciona un ingrediente</option>
                {catalogo.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    disabled={
                      c.id !== linea.ingredienteId && lineas.some((l) => l.ingredienteId === c.id)
                    }
                  >
                    {c.nombre} ({c.unidad}){c.inactivo ? ' - inactivo' : ''}
                  </option>
                ))}
              </Input>
              <InputGroup style={{ maxWidth: 200 }}>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Cantidad"
                  value={linea.cantidad}
                  onChange={(e) => cambiarLinea(linea.clave, 'cantidad', e.target.value)}
                />
                <InputGroupText>{elegido?.unidad || '—'}</InputGroupText>
              </InputGroup>
              <Button
                color="outline-secondary"
                onClick={() => quitarLinea(linea.clave)}
                disabled={lineas.length === 1}
                aria-label="Quitar ingrediente"
              >
                <i className="bi bi-trash" />
              </Button>
            </div>
          )
        })}

        <Button
          color="outline-secondary"
          size="sm"
          onClick={() => setLineas([...lineas, nuevaLinea()])}
          disabled={lineas.length >= 50}
        >
          <i className="bi bi-plus-lg me-1" />
          Agregar ingrediente
        </Button>

        {costoEstimado !== null && (
          <div className="text-muted small mt-3">
            Costo estimado por unidad: <strong>{fmtCosto(costoEstimado)}</strong> (con el último
            costo de cada ingrediente)
          </div>
        )}

        <FormGroup className="mt-3">
          <Label for="rec-instrucciones">Instrucciones (opcional)</Label>
          <Input
            id="rec-instrucciones"
            type="textarea"
            rows="3"
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="outline-secondary" onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <Button color="warning" onClick={guardar} disabled={guardando}>
          {guardando ? <Spinner size="sm" /> : 'Guardar receta'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
