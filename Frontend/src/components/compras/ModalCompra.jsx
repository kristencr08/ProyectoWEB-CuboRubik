import { useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, FormGroup, Label, Input, InputGroup, InputGroupText, Alert, Spinner, Row, Col,
} from 'reactstrap'
import { api } from '../../api/client'
import { fmtCosto } from '../../utils/formatoInventario'

// Mismo porcentaje de IVA que usa el backend. Los costos que se escriben van SIN IVA.
const IVA = 0.13

// Cada línea de la compra es un objeto { clave, articulo, cantidad, costo }.
// "articulo" guarda "TIPO:ID" (por ejemplo "INGREDIENTE:5") para saber de qué tabla viene.
// "clave" solo sirve para que React identifique la línea al agregar o quitar.
const nuevaLinea = () => ({
  clave: `${Date.now()}-${Math.random()}`,
  articulo: '',
  cantidad: '',
  costo: '',
})

// El backend guarda cantidades con 3 decimales y costos en centavos (2 decimales)
const maxDecimales = (n, max) => {
  const factor = 10 ** max
  return Math.abs(n * factor - Math.round(n * factor)) < 1e-6
}

// Registra una compra. Queda PENDIENTE: el inventario no cambia hasta "Recibir compra".
export default function ModalCompra({ proveedores, articulos, onClose, onGuardado }) {
  const [proveedorId, setProveedorId] = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [diasCredito, setDiasCredito] = useState('0')
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState([nuevaLinea()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const buscar = (clave) => articulos.find((a) => `${a.tipo}:${a.articulo_id}` === clave)

  const cambiarLinea = (clave, campo, valor) =>
    setLineas(lineas.map((l) => (l.clave === clave ? { ...l, [campo]: valor } : l)))

  // Al elegir un artículo, se sugiere su último costo (se puede cambiar)
  const elegirArticulo = (clave, valor) => {
    const articulo = buscar(valor)
    setLineas(
      lineas.map((l) =>
        l.clave === clave
          ? {
              ...l,
              articulo: valor,
              costo:
                l.costo === '' && articulo && articulo.ultimo_costo !== null
                  ? Number(articulo.ultimo_costo).toFixed(2)
                  : l.costo,
            }
          : l,
      ),
    )
  }

  const quitarLinea = (clave) => setLineas(lineas.filter((l) => l.clave !== clave))

  // Totales estimados en centavos (el backend calcula los definitivos)
  const subtotalLinea = (l) =>
    Math.round(Number(l.cantidad || 0) * Math.round(Number(l.costo || 0) * 100))
  const subtotal = lineas.reduce((suma, l) => suma + subtotalLinea(l), 0)
  const iva = Math.round(subtotal * IVA)
  const total = subtotal + iva

  const validar = () => {
    if (!proveedorId) return 'Selecciona un proveedor.'
    if (numeroDocumento.trim().length < 1 || numeroDocumento.trim().length > 50) {
      return 'El número de documento es obligatorio (máximo 50 caracteres).'
    }
    const dias = Number(diasCredito)
    if (diasCredito === '' || !Number.isInteger(dias) || dias < 0 || dias > 365) {
      return 'Los días de crédito deben ser un número entero entre 0 y 365.'
    }
    if (lineas.length === 0) return 'La compra debe tener al menos un artículo.'
    if (lineas.length > 100) return 'La compra no puede tener más de 100 líneas.'

    for (let i = 0; i < lineas.length; i += 1) {
      const { articulo, cantidad, costo } = lineas[i]
      const numero = i + 1
      if (!articulo) return `Línea ${numero}: selecciona un artículo.`
      const c = Number(cantidad)
      if (cantidad === '' || !(c > 0) || !maxDecimales(c, 3)) {
        return `Línea ${numero}: la cantidad debe ser mayor que 0 (máximo 3 decimales).`
      }
      const k = Number(costo)
      if (costo === '' || Number.isNaN(k) || k < 0 || !maxDecimales(k, 2)) {
        return `Línea ${numero}: el costo unitario no puede ser negativo (máximo 2 decimales).`
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
      await api.crearCompra({
        proveedorId: Number(proveedorId),
        numeroDocumento: numeroDocumento.trim(),
        diasCredito: Number(diasCredito),
        observaciones: observaciones.trim() || undefined,
        detalles: lineas.map((l) => {
          const articulo = buscar(l.articulo)
          return {
            tipo: articulo.tipo,
            articuloId: Number(articulo.articulo_id),
            cantidad: Number(l.cantidad),
            costoUnitario: Number(l.costo),
          }
        }),
      })
      onGuardado(
        `Compra ${numeroDocumento.trim()} registrada como pendiente. Ábrela y presiona "Recibir compra" para que entre al inventario.`,
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const opcionesDe = (tipo) =>
    articulos
      .filter((a) => a.tipo === tipo)
      .map((a) => (
        <option key={`${a.tipo}:${a.articulo_id}`} value={`${a.tipo}:${a.articulo_id}`}>
          {a.nombre} ({a.unidad})
        </option>
      ))

  return (
    <Modal isOpen toggle={onClose} centered size="lg" scrollable>
      <ModalHeader toggle={onClose}>Nueva compra</ModalHeader>
      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}

        <Row className="g-3 mb-3">
          <Col md={6}>
            <Label for="compra-proveedor">Proveedor</Label>
            <Input
              id="compra-proveedor"
              type="select"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((p) => (
                <option key={p.proveedor_id} value={p.proveedor_id}>
                  {p.nombre}
                </option>
              ))}
            </Input>
          </Col>
          <Col md={3}>
            <Label for="compra-doc">N.º de documento</Label>
            <Input
              id="compra-doc"
              maxLength={50}
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="Factura del proveedor"
            />
          </Col>
          <Col md={3}>
            <Label for="compra-dias">Días de crédito</Label>
            <Input
              id="compra-dias"
              type="number"
              min="0"
              max="365"
              step="1"
              value={diasCredito}
              onChange={(e) => setDiasCredito(e.target.value)}
            />
          </Col>
        </Row>

        <Label>Artículos comprados</Label>
        {lineas.map((linea) => {
          const articulo = buscar(linea.articulo)
          return (
            <div key={linea.clave} className="d-flex flex-wrap gap-2 mb-2 align-items-start">
              <Input
                type="select"
                value={linea.articulo}
                onChange={(e) => elegirArticulo(linea.clave, e.target.value)}
                style={{ flex: '1 1 220px' }}
              >
                <option value="">Selecciona un artículo</option>
                <optgroup label="Ingredientes">{opcionesDe('INGREDIENTE')}</optgroup>
                <optgroup label="Productos de reventa">{opcionesDe('PRODUCTO_DIRECTO')}</optgroup>
              </Input>
              <InputGroup style={{ width: 170 }}>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Cantidad"
                  value={linea.cantidad}
                  onChange={(e) => cambiarLinea(linea.clave, 'cantidad', e.target.value)}
                />
                <InputGroupText>{articulo?.unidad || '—'}</InputGroupText>
              </InputGroup>
              <InputGroup style={{ width: 150 }}>
                <InputGroupText>$</InputGroupText>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Costo"
                  value={linea.costo}
                  onChange={(e) => cambiarLinea(linea.clave, 'costo', e.target.value)}
                />
              </InputGroup>
              <div className="text-end pt-2" style={{ width: 80 }}>
                {fmtCosto(subtotalLinea(linea) / 100)}
              </div>
              <Button
                color="outline-secondary"
                onClick={() => quitarLinea(linea.clave)}
                disabled={lineas.length === 1}
                aria-label="Quitar artículo"
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
          disabled={lineas.length >= 100}
        >
          <i className="bi bi-plus-lg me-1" />
          Agregar artículo
        </Button>

        <div className="border-top mt-3 pt-2 ms-auto" style={{ maxWidth: 280 }}>
          <div className="d-flex justify-content-between">
            <span>Subtotal</span>
            <span>{fmtCosto(subtotal / 100)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>IVA 13%</span>
            <span>{fmtCosto(iva / 100)}</span>
          </div>
          <div className="d-flex justify-content-between fs-5 fw-bold">
            <span>Total</span>
            <span>{fmtCosto(total / 100)}</span>
          </div>
          <div className="small text-muted">Los costos se escriben sin IVA. Total estimado.</div>
        </div>

        <FormGroup className="mt-3">
          <Label for="compra-obs">Observaciones (opcional)</Label>
          <Input
            id="compra-obs"
            type="textarea"
            rows="2"
            maxLength={500}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="outline-secondary" onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <Button color="warning" onClick={guardar} disabled={guardando}>
          {guardando ? <Spinner size="sm" /> : 'Registrar compra'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
