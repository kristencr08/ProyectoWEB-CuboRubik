import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Table, Badge } from 'reactstrap'
import { fmtCantidad, fmtCosto } from '../../utils/formatoInventario'

// Muestra la receta de un producto: ingredientes, costo por unidad y margen.
export default function ModalDetalleReceta({ producto, onClose }) {
  const precio = Number(producto.precio_venta)
  const costo = Number(producto.costo_unitario)
  const margen = precio - costo

  return (
    <Modal isOpen toggle={onClose} centered size="lg" scrollable>
      <ModalHeader toggle={onClose}>{producto.producto}</ModalHeader>
      <ModalBody>
        <p className="text-muted mb-3">
          {producto.receta} · rinde {fmtCantidad(producto.cantidad_producida)} unidad(es)
          {!producto.receta_activa && (
            <Badge color="secondary" className="ms-2">
              Inactiva
            </Badge>
          )}
        </p>

        <div className="table-responsive">
          <Table size="sm" className="align-middle">
            <thead className="table-light">
              <tr>
                <th>Ingrediente</th>
                <th className="text-end">Cantidad por receta</th>
                <th className="text-end">Costo por unidad</th>
              </tr>
            </thead>
            <tbody>
              {producto.ingredientes.map((i) => (
                <tr key={i.ingrediente_id}>
                  <td>{i.nombre}</td>
                  <td className="text-end">
                    {fmtCantidad(i.cantidad)} {i.unidad}
                  </td>
                  <td className="text-end">{fmtCosto(i.costo_linea)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        <div className="border-top pt-2">
          <div className="d-flex justify-content-between">
            <span>Costo por unidad</span>
            <strong>{fmtCosto(costo)}</strong>
          </div>
          <div className="d-flex justify-content-between">
            <span>Precio de venta (sin IVA)</span>
            <strong>{fmtCosto(precio)}</strong>
          </div>
          <div className="d-flex justify-content-between">
            <span>Margen</span>
            <strong className={margen < 0 ? 'text-danger' : 'text-success'}>
              {fmtCosto(margen)}
            </strong>
          </div>
        </div>

        {producto.instrucciones && (
          <div className="mt-3">
            <div className="fw-semibold">Instrucciones</div>
            <div className="text-muted" style={{ whiteSpace: 'pre-line' }}>
              {producto.instrucciones}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="warning" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
