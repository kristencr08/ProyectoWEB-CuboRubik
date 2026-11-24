import { useEffect, useMemo, useState, useCallback } from 'react'
import { Table, Badge, Button, Input, Alert, Spinner } from 'reactstrap'
import { api } from '../api/client'
import { fmtCosto, fmtFecha, ESTADO_COMPRA } from '../utils/formatoInventario'
import GrupoFiltro from '../components/GrupoFiltro'
import ModalCompra from '../components/compras/ModalCompra'
import ModalDetalleCompra from '../components/compras/ModalDetalleCompra'

// La ruta /compras solo la ven ADMINISTRADOR y GERENTE (utils/permisos.js),
// y el backend exige el mismo rol, por eso aquí no hace falta ocultar botones.
export default function Compras() {
  const [compras, setCompras] = useState([])
  const [estado, setEstado] = useState('') // '' | PENDIENTE | RECIBIDA | ANULADA
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  // Datos que necesita el formulario de nueva compra
  const [proveedores, setProveedores] = useState([])
  const [articulos, setArticulos] = useState([])

  const [nueva, setNueva] = useState(false)
  const [detalle, setDetalle] = useState(null) // la compra abierta, con sus líneas
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Cada vez que cambia el filtro de estado se vuelve a pedir la lista al backend
  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const data = await api.compras({ estado, limite: 100 })
      setCompras(data.compras)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [estado])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Proveedores y artículos se cargan una sola vez, al abrir la pantalla
  useEffect(() => {
    Promise.all([api.proveedores(), api.inventario()])
      .then(([resProveedores, resInventario]) => {
        setProveedores(resProveedores.proveedores.filter((p) => p.activo))
        setArticulos(resInventario.inventario)
      })
      .catch((e) => setError(e.message))
  }, [])

  const abrirDetalle = async (id) => {
    setCargandoDetalle(true)
    setError('')
    try {
      const data = await api.compra(id)
      setDetalle(data.compra)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargandoDetalle(false)
    }
  }

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return compras.filter(
      (c) =>
        !texto ||
        (c.numero_documento || '').toLowerCase().includes(texto) ||
        c.proveedor.toLowerCase().includes(texto),
    )
  }, [compras, busqueda])

  const alCambiar = (texto) => {
    setNueva(false)
    setDetalle(null)
    setMensaje(texto)
    cargar()
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <h2 className="fw-bold mb-0">Compras</h2>
        <Button color="warning" onClick={() => setNueva(true)}>
          <i className="bi bi-plus-lg me-1" />
          Nueva compra
        </Button>
      </div>

      {error && <Alert color="danger" toggle={() => setError('')}>{error}</Alert>}
      {mensaje && (
        <Alert color="success" toggle={() => setMensaje('')}>
          {mensaje}
        </Alert>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Input
          placeholder="Buscar por documento o proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <GrupoFiltro
          opciones={[
            ['', 'Todas'],
            ['PENDIENTE', 'Pendientes'],
            ['RECIBIDA', 'Recibidas'],
            ['ANULADA', 'Anuladas'],
          ]}
          valor={estado}
          onChange={setEstado}
        />
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Documento</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Crédito</th>
                <th className="text-end">IVA</th>
                <th className="text-end">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    {compras.length === 0
                      ? 'Aún no hay compras. Registra la primera con "Nueva compra".'
                      : 'No hay compras que coincidan con la búsqueda.'}
                  </td>
                </tr>
              )}
              {visibles.map((c) => {
                const e = ESTADO_COMPRA[c.estado] || ESTADO_COMPRA.PENDIENTE
                return (
                  <tr
                    key={c.compra_id}
                    className="fila-click"
                    onClick={() => abrirDetalle(c.compra_id)}
                  >
                    <td>{c.numero_documento}</td>
                    <td>{c.proveedor}</td>
                    <td>{fmtFecha(c.fecha_compra)}</td>
                    <td>{c.dias_credito > 0 ? `${c.dias_credito} días` : 'Contado'}</td>
                    <td className="text-end">{fmtCosto(c.iva)}</td>
                    <td className="text-end">{fmtCosto(c.total)}</td>
                    <td>
                      <Badge color={e.color}>{e.texto}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}

      {cargandoDetalle && <Spinner size="sm" className="mt-2" />}

      {nueva && (
        <ModalCompra
          proveedores={proveedores}
          articulos={articulos}
          onClose={() => setNueva(false)}
          onGuardado={alCambiar}
        />
      )}

      {detalle && (
        <ModalDetalleCompra
          compra={detalle}
          onClose={() => setDetalle(null)}
          onCambio={alCambiar}
        />
      )}
    </div>
  )
}
