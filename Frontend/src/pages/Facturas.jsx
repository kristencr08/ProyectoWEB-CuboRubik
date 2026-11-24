import { useEffect, useState } from 'react'
import {
  Alert, Badge, Button, ButtonGroup, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Spinner, Table,
} from 'reactstrap'
import { api } from '../api/client'
import { fecha, money, nombreDocumento } from '../utils/formato'

export default function Facturas() {
  const [facturas, setFacturas] = useState([])
  const [tipo, setTipo] = useState('') // '' | FACTURA | CCF
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [detalle, setDetalle] = useState(null) // { factura, detalles, pagos }
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  //Cada vez que cambia el filtro se vuelve a pedir la lista al backend
  useEffect(() => {
    setCargando(true)
    setError('')
    api
      .facturas(tipo)
      .then((data) => setFacturas(data.facturas))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [tipo])

  const abrirDetalle = async (id) => {
    setCargandoDetalle(true)
    setError('')
    try {
      setDetalle(await api.factura(id))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoDetalle(false)
    }
  }

  const visibles = facturas.filter((f) => {
    const texto = `${f.serie}-${f.numero} ${f.cliente_nombre}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  return (
    <div>
      <h2 className="fw-bold mb-3">Facturas emitidas</h2>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Input
          placeholder="Buscar por número o cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <ButtonGroup>
          {[['', 'Todas'], ['FACTURA', 'Consumidor final'], ['CCF', 'CCF']].map(([valor, label]) => (
            <Button key={valor} color={tipo === valor ? 'warning' : 'outline-secondary'} onClick={() => setTipo(valor)}>
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {error && <Alert color="danger">{error}</Alert>}
      {cargando && <Spinner />}

      {!cargando && (
        <div className="table-responsive bg-white rounded shadow-sm">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Sucursal</th>
                <th className="text-end">IVA</th>
                <th className="text-end">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.factura_id} className="fila-click" onClick={() => abrirDetalle(f.factura_id)}>
                  <td className="fw-semibold">{f.serie}-{f.numero}</td>
                  <td>{f.tipo_documento === 'CCF' ? 'CCF' : 'Consumidor final'}</td>
                  <td>{fecha(f.fecha_emision)}</td>
                  <td>{f.cliente_nombre}</td>
                  <td>{f.sucursal}</td>
                  <td className="text-end">{money(f.iva)}</td>
                  <td className="text-end fw-semibold">{money(f.total)}</td>
                  <td><Badge color={f.estado === 'EMITIDA' ? 'success' : 'secondary'}>{f.estado}</Badge></td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr><td colSpan="8" className="text-center text-muted py-4">No hay facturas para mostrar.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      {cargandoDetalle && <Spinner size="sm" className="mt-2" />}

      {/*Modal: detalle de factura*/}
      <Modal isOpen={!!detalle} toggle={() => setDetalle(null)} centered>
        <ModalHeader toggle={() => setDetalle(null)} className="no-print">Detalle del documento</ModalHeader>
        {detalle && (
          <ModalBody className="comprobante">
            <div className="text-center mb-3">
              <h5 className="fw-bold mb-0">Restaurante Orígenes SV</h5>
              <div className="small text-muted">{detalle.factura.sucursal}</div>
              <div className="small">{nombreDocumento(detalle.factura.tipo_documento === 'CCF' ? 'CCF' : 'FACTURA')}</div>
              <Badge color="dark" className="mt-2">{detalle.factura.serie} · N.º {detalle.factura.numero}</Badge>
              <div className="small text-muted mt-1">{fecha(detalle.factura.fecha_emision)}</div>
            </div>

            <div className="small mb-2">
              <strong>Cliente:</strong> {detalle.factura.cliente_nombre}
              {detalle.factura.cliente_documento && ` (${detalle.factura.cliente_documento})`}
            </div>

            <Table size="sm" borderless>
              <tbody>
                {detalle.detalles.map((d, i) => (
                  <tr key={i}>
                    <td>{Number(d.cantidad)} × {d.producto}</td>
                    <td className="text-end">{money(d.subtotal_linea)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="border-top pt-2 small">
              <div className="d-flex justify-content-between"><span>Subtotal</span><span>{money(detalle.factura.subtotal)}</span></div>
              <div className="d-flex justify-content-between"><span>IVA {Number(detalle.factura.porcentaje_iva)}%</span><span>{money(detalle.factura.iva)}</span></div>
              <div className="d-flex justify-content-between fs-5 fw-bold"><span>Total</span><span>{money(detalle.factura.total)}</span></div>
              {detalle.pagos.map((p, i) => (
                <div key={i} className="text-muted">Pago: {p.metodo} ({money(p.monto)})</div>
              ))}
            </div>
          </ModalBody>
        )}
        <ModalFooter className="no-print">
          <Button color="outline-secondary" onClick={() => window.print()}>Imprimir</Button>
          <Button color="warning" onClick={() => setDetalle(null)}>Cerrar</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
