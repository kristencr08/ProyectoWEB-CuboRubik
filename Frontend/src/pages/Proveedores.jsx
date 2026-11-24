import { useEffect, useMemo, useState, useCallback } from 'react'
import { Table, Badge, Button, Input, Alert, Spinner } from 'reactstrap'
import { api } from '../api/client'
import ModalProveedor from '../components/proveedores/ModalProveedor'
import GrupoFiltro from '../components/GrupoFiltro'

// La ruta /proveedores solo la ven ADMINISTRADOR y GERENTE (utils/permisos.js),
// y el backend exige el mismo rol, por eso aquí no hace falta ocultar botones.
export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  // Filtros (se aplican en el navegador)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')

  // null = modal cerrado, { proveedor: null } = crear, { proveedor: {...} } = editar
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const data = await api.proveedores()
      setProveedores(data.proveedores)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return proveedores.filter(
      (p) =>
        (filtroEstado === 'todos' ||
          (filtroEstado === 'activos' ? p.activo : !p.activo)) &&
        (!texto ||
          p.nombre.toLowerCase().includes(texto) ||
          (p.documento || '').toLowerCase().includes(texto) ||
          (p.correo || '').toLowerCase().includes(texto)),
    )
  }, [proveedores, busqueda, filtroEstado])

  const alGuardar = (texto) => {
    setModal(null)
    setMensaje(texto)
    cargar()
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <h2 className="fw-bold mb-0">Proveedores</h2>
        <Button color="primary" onClick={() => setModal({ proveedor: null })}>
          <i className="bi bi-plus-lg me-1" />
          Nuevo proveedor
        </Button>
      </div>

      {error && <Alert color="danger">{error}</Alert>}
      {mensaje && (
        <Alert color="success" toggle={() => setMensaje('')}>
          {mensaje}
        </Alert>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Input
          type="search"
          placeholder="Buscar por nombre, documento o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <GrupoFiltro
          opciones={[
            ['activos', 'Activos'],
            ['inactivos', 'Inactivos'],
            ['todos', 'Todos'],
          ]}
          valor={filtroEstado}
          onChange={setFiltroEstado}
        />
      </div>

      {cargando ? (
        <div className="text-center py-5">
          <Spinner color="primary" />
        </div>
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm">
<Table hover className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  {proveedores.length === 0
                    ? 'Aún no hay proveedores. Crea el primero con "Nuevo proveedor".'
                    : 'No hay proveedores que coincidan con los filtros.'}
                </td>
              </tr>
            )}
            {visibles.map((p) => (
              <tr key={p.proveedor_id}>
                <td>
                  {p.nombre}
                  {p.direccion && <div className="small text-muted">{p.direccion}</div>}
                </td>
                <td>{p.documento || '—'}</td>
                <td>{p.telefono || '—'}</td>
                <td>{p.correo || '—'}</td>
                <td>
                  <Badge color={p.activo ? 'success' : 'secondary'}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="text-end">
                  <Button
                    size="sm"
                    color="secondary"
                    outline
                    onClick={() => setModal({ proveedor: p })}
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
</div>
      )}

      {modal && (
        <ModalProveedor
          proveedor={modal.proveedor}
          onClose={() => setModal(null)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}
